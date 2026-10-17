import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

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

    let parsedSkills: string[] = [];
    try {
      parsedSkills = JSON.parse(profile.currentSkills);
    } catch {}

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

    // Readiness score calculation
    let readinessScore: number | null = null;
    if (activeReport) {
      const baseScore = activeReport.readinessScore;
      if (activePlan && activePlan.tasks.length > 0) {
        const completedTasks = activePlan.tasks.filter((t) => t.isCompleted);
        if (completedTasks.length > 0) {
          const missingPriorityMap = new Map<string, number>();
          try {
            const missingItems: Array<{ name: string; priority: string }> = JSON.parse(
              activeReport.missingSkills || '[]'
            );
            for (const item of missingItems) {
              const w = item.priority === 'High' ? 3 : item.priority === 'Medium' ? 2 : 1;
              missingPriorityMap.set(item.name.toLowerCase(), w);
            }
          } catch {}

          let totalWeight = 0;
          let completedWeight = 0;
          for (const t of activePlan.tasks) {
            let taskWeight = 2;
            Array.from(missingPriorityMap.entries()).forEach(([skillName, w]) => {
              if (
                t.title.toLowerCase().includes(skillName) ||
                t.description.toLowerCase().includes(skillName)
              ) {
                taskWeight = Math.max(taskWeight, w);
              }
            });
            totalWeight += taskWeight;
            if (t.isCompleted) completedWeight += taskWeight;
          }
          const weightedProgress =
            totalWeight > 0
              ? completedWeight / totalWeight
              : completedTasks.length / activePlan.tasks.length;
          const potentialGain = 95 - baseScore;
          readinessScore = Math.min(95, Math.round(baseScore + potentialGain * weightedProgress));
        } else {
          readinessScore = baseScore;
        }
      } else {
        readinessScore = baseScore;
      }
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
    console.error('Session GET error:', err);
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

    const userId = user.id;
    const body = await req.json();
    const { targetRole, currentSkills, readinessScore } = body;

    const profile = await prisma.profile.upsert({
      where: { id: userId },
      update: {
        ...(targetRole ? { targetRole } : {}),
        ...(currentSkills ? { currentSkills: JSON.stringify(currentSkills) } : {}),
        ...(typeof readinessScore === 'number' ? { readinessScore } : {}),
      },
      create: {
        id: userId,
        email: user.email,
        fullName: user.user_metadata?.full_name || null,
        targetRole: targetRole || null,
        currentSkills: JSON.stringify(currentSkills || []),
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
  } catch (err: any) {
    console.error('Session POST error:', err);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
