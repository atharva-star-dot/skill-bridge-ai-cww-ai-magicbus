import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils/safe-json';

export const dynamic = 'force-dynamic';

/**
 * GET /api/my-data
 * Returns complete user data payload in JSON format for data portability.
 * Scoped strictly to authenticated user.id.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    const [profile, gapReports, learningPlans, resumeReviews, interviewSessions] =
      await Promise.all([
        prisma.profile.findUnique({ where: { id: userId } }),
        prisma.skillGapReport.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.learningPlan.findMany({
          where: { userId },
          include: {
            tasks: {
              orderBy: [{ weekNumber: 'asc' }],
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.resumeReview.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.interviewSession.findMany({
          where: { userId },
          include: {
            answers: {
              orderBy: { questionIndex: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const dataPayload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        fullName: profile?.fullName || user.user_metadata?.full_name || null,
        targetRole: profile?.targetRole || null,
        currentSkills: safeJsonParse(profile?.currentSkills, []),
        readinessScore: profile?.readinessScore ?? null,
      },
      gapReports: gapReports.map((r) => ({
        ...r,
        matchedSkills: safeJsonParse(r.matchedSkills, []),
        missingSkills: safeJsonParse(r.missingSkills, []),
      })),
      learningPlans: learningPlans.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => ({
          ...t,
          resources: safeJsonParse(t.resources, []),
        })),
      })),
      resumeReviews: resumeReviews.map((rr) => ({
        ...rr,
        strengths: safeJsonParse(rr.strengths, []),
        weaknesses: safeJsonParse(rr.weaknesses, []),
        missingKeywords: safeJsonParse(rr.missingKeywords, []),
        bulletRewrites: safeJsonParse(rr.bulletRewrites, []),
      })),
      interviewSessions: interviewSessions.map((s) => ({
        ...s,
        summary: safeJsonParse(s.summary, null),
        answers: s.answers.map((a) => ({
          ...a,
          feedback: safeJsonParse(a.feedback, null),
        })),
      })),
    };

    return NextResponse.json(dataPayload, {
      headers: {
        'Content-Disposition': `attachment; filename="skill-bridge-ai-data-${user.id}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    console.error(
      '[MyData:GET] Export failed:',
      err instanceof Error ? err.name : 'UnknownError'
    );
    return NextResponse.json({ error: 'Failed to export user data' }, { status: 500 });
  }
}

/**
 * DELETE /api/my-data
 * Permanently deletes all user data and profile via cascading deletion.
 */
export async function DELETE() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const admin = createAdminClient();

    await prisma.profile.deleteMany({ where: { id: userId } });

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      throw new Error('Supabase Auth account deletion failed.');
    }

    return NextResponse.json({ success: true, message: 'All user data successfully deleted' });
  } catch (err: unknown) {
    console.error(
      '[MyData:DELETE] Account deletion failed:',
      err instanceof Error ? err.name : 'UnknownError'
    );
    return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
  }
}
