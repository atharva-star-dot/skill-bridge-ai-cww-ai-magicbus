import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { SessionUpdateSchema } from '@/lib/schemas/session.schema';
import { SEED_ROLES } from '@/data/seed-roles';
import { computeReadiness } from '@/lib/scoring/compute-readiness';
import { textContainsSkill } from '@/lib/scoring/skill-matching';
import { safeJsonParse } from '@/lib/utils/safe-json';
import { logServerError } from '@/lib/logging/server-error';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
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

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile || !profile.targetRole) {
      return NextResponse.json(
        {
          userId,
          sessionId: userId,
          targetRole: null,
          currentSkills: [],
          readinessScore: null,
          activePlanSummary: null,
          activeResumeSummary: null,
          activeInterviewSummary: null,
          updatedAt: new Date().toISOString(),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const currentRole = profile.targetRole;

    // Check if an active gap report exists for THIS role
    const activeReport = await prisma.skillGapReport.findFirst({
      where: {
        userId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Find the latest learning plan strictly for THIS active role
    const activePlan = await prisma.learningPlan.findFirst({
      where: {
        userId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
      include: { tasks: true },
    });

    const parsedSkills = safeJsonParse<string[]>(profile.currentSkills, []);

    const activePlanSummary = activePlan
      ? {
          id: activePlan.id,
          targetRole: activePlan.targetRole,
          durationWeeks: activePlan.durationWeeks,
          completedTasksCount: activePlan.tasks.filter((t) => t.isCompleted).length,
          totalTasksCount: activePlan.tasks.length,
          completionPercentage: activePlan.completionPercentage,
        }
      : null;

    let readinessScore: number | null = null;
    if (activeReport) {
      const matchedSkills = safeJsonParse<string[]>(activeReport.matchedSkills, []);
      const missingSkills = safeJsonParse<
        Array<{ name: string; priority: 'High' | 'Medium' | 'Low' }>
      >(activeReport.missingSkills, []);
      const seedRole = SEED_ROLES.find(
        (role) =>
          role.title.toLowerCase() === currentRole.toLowerCase() ||
          role.slug === currentRole.toLowerCase()
      );
      const benchmark = seedRole
        ? {
            requiredSkills: seedRole.requiredSkills,
            goodToHaveSkills: seedRole.goodToHaveSkills,
          }
        : {
            requiredSkills: [...matchedSkills, ...missingSkills.map((skill) => skill.name)],
            goodToHaveSkills: [],
          };

      let taskProgress:
        | { completedWeight: number; totalWeight: number }
        | undefined;
      if (activePlan && activePlan.tasks.length > 0) {
        const missingPriorityMap = new Map(
          missingSkills.map((skill) => [
            skill.name.toLowerCase(),
            skill.priority === 'High' ? 3 : skill.priority === 'Medium' ? 2 : 1,
          ])
        );
        let totalWeight = 0;
        let completedWeight = 0;

        for (const task of activePlan.tasks) {
          let weight = 2;
          for (const [skillName, priorityWeight] of Array.from(missingPriorityMap.entries())) {
            if (textContainsSkill(task.title, skillName) || textContainsSkill(task.description, skillName)) {
              weight = Math.max(weight, priorityWeight);
            }
          }
          totalWeight += weight;
          if (task.isCompleted) completedWeight += weight;
        }
        taskProgress = { completedWeight, totalWeight };
      }

      readinessScore = computeReadiness({
        benchmark,
        matchedSkills,
        missingSkills,
        taskProgress,
      });
    }

    // Find latest resume review strictly for THIS active role
    const activeReview = await prisma.resumeReview.findFirst({
      where: {
        userId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeResumeSummary = activeReview
      ? {
          id: activeReview.id,
          atsScore: activeReview.atsScore,
          createdAt: activeReview.createdAt.toISOString(),
        }
      : null;

    // Find latest completed interview strictly for THIS active role
    const activeInterview = await prisma.interviewSession.findFirst({
      where: {
        userId,
        targetRole: { equals: currentRole },
        status: 'completed',
      },
      orderBy: { createdAt: 'desc' },
    });

    let interviewScore: number | null = null;
    if (activeInterview?.summary) {
      try {
        const parsedSumm = JSON.parse(activeInterview.summary);
        interviewScore = parsedSumm.overallScore ?? null;
      } catch {}
    }

    const activeInterviewSummary = activeInterview
      ? {
          id: activeInterview.id,
          overallScore: interviewScore,
          createdAt: activeInterview.createdAt.toISOString(),
        }
      : null;

    return NextResponse.json(
      {
        userId,
        sessionId: userId,
        targetRole: profile.targetRole,
        currentSkills: parsedSkills,
        readinessScore,
        activePlanSummary,
        activeResumeSummary,
        activeInterviewSummary,
        updatedAt: profile.updatedAt.toISOString(),
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: any) {
    logServerError('session.get', err, { route: '/api/session' });
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const validation = SessionUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      );
    }

    const userId = user.id;
    const { targetRole, currentSkills, readinessScore } = validation.data;

    const profile = await prisma.profile.upsert({
      where: { id: userId },
      update: {
        ...(targetRole !== undefined ? { targetRole } : {}),
        ...(currentSkills !== undefined ? { currentSkills: JSON.stringify(currentSkills) } : {}),
        ...(typeof readinessScore === 'number' ? { readinessScore } : {}),
      },
      create: {
        id: userId,
        email: user.email,
        fullName: user.user_metadata?.full_name || null,
        targetRole: targetRole ?? null,
        currentSkills: JSON.stringify(currentSkills ?? []),
        readinessScore: typeof readinessScore === 'number' ? readinessScore : 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        userId: profile.id,
        sessionId: profile.id,
        targetRole: profile.targetRole,
        updatedAt: profile.updatedAt.toISOString(),
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: unknown) {
    logServerError('session.post', err, { route: '/api/session' });
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
