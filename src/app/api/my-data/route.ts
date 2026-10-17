import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

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
        currentSkills: profile?.currentSkills ? JSON.parse(profile.currentSkills) : [],
        readinessScore: profile?.readinessScore ?? null,
      },
      gapReports: gapReports.map((r) => ({
        ...r,
        matchedSkills: JSON.parse(r.matchedSkills || '[]'),
        missingSkills: JSON.parse(r.missingSkills || '[]'),
      })),
      learningPlans: learningPlans.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => ({
          ...t,
          resources: JSON.parse(t.resources || '[]'),
        })),
      })),
      resumeReviews: resumeReviews.map((rr) => ({
        ...rr,
        strengths: JSON.parse(rr.strengths || '[]'),
        weaknesses: JSON.parse(rr.weaknesses || '[]'),
        missingKeywords: JSON.parse(rr.missingKeywords || '[]'),
        bulletRewrites: JSON.parse(rr.bulletRewrites || '[]'),
      })),
      interviewSessions: interviewSessions.map((s) => ({
        ...s,
        summary: s.summary ? JSON.parse(s.summary) : null,
        answers: s.answers.map((a) => ({
          ...a,
          feedback: a.feedback ? JSON.parse(a.feedback) : null,
        })),
      })),
    };

    return NextResponse.json(dataPayload, {
      headers: {
        'Content-Disposition': `attachment; filename="skill-bridge-ai-data-${user.id}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[MyData:GET] Error exporting data:', err?.message);
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

    // Delete profile (Prisma cascade will delete gap reports, plans, tasks, resume reviews, interview sessions and answers)
    await prisma.profile.delete({
      where: { id: userId },
    }).catch(() => {
      // Profile may not exist in DB yet
    });

    // Also sign user out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: 'All user data successfully deleted' });
  } catch (err: any) {
    console.error('[MyData:DELETE] Error deleting user data:', err?.message);
    return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
  }
}
