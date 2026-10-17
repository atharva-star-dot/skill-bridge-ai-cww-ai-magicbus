import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId query parameter is required' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.targetRoleTitle) {
      return NextResponse.json({
        sessionId,
        targetRole: null,
        currentSkills: [],
        readinessScore: null,
        activePlanSummary: null,
        updatedAt: new Date().toISOString(),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const currentRole = session.targetRoleTitle;

    // Check if an active gap report exists for THIS role
    const activeReport = await prisma.skillGapReport.findFirst({
      where: {
        sessionId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Find the latest learning plan strictly for THIS active role
    const activePlan = await prisma.learningPlan.findFirst({
      where: {
        sessionId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
      include: { tasks: true },
    });

    let parsedSkills: string[] = [];
    try {
      parsedSkills = JSON.parse(session.currentSkills);
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

    // Readiness score calculation:
    // If no gap report exists yet for this role, return null so UI shows "Run the gap detector"
    // If report exists and plan has tasks completed, calculate/restore the boosted score.
    // If report exists but no plan or 0 tasks, return base report score.
    let readinessScore: number | null = null;

    if (activeReport) {
      const baseScore = activeReport.readinessScore;
      if (activePlan && activePlan.tasks.length > 0) {
        const completedTasks = activePlan.tasks.filter((t) => t.isCompleted);
        if (completedTasks.length > 0) {
          // Calculate weighted progress
          let missingPriorityMap = new Map<string, number>();
          try {
            const missingItems: Array<{ name: string; priority: string }> = JSON.parse(activeReport.missingSkills || '[]');
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
              if (t.title.toLowerCase().includes(skillName) || t.description.toLowerCase().includes(skillName)) {
                taskWeight = Math.max(taskWeight, w);
              }
            });
            totalWeight += taskWeight;
            if (t.isCompleted) completedWeight += taskWeight;
          }
          const weightedProgress = totalWeight > 0 ? (completedWeight / totalWeight) : (completedTasks.length / activePlan.tasks.length);
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
        sessionId,
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

    return NextResponse.json({
      sessionId: session.id,
      targetRole: session.targetRoleTitle,
      currentSkills: parsedSkills,
      readinessScore,
      activePlanSummary,
      activeResumeSummary,
      updatedAt: session.updatedAt.toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('Session GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, targetRole, currentSkills, readinessScore } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const existingSession = await prisma.session.findUnique({ where: { id: sessionId } });

    const session = await prisma.session.upsert({
      where: { id: sessionId },
      update: {
        ...(targetRole ? { targetRoleTitle: targetRole } : {}),
        ...(currentSkills ? { currentSkills: JSON.stringify(currentSkills) } : {}),
        ...(typeof readinessScore === 'number' ? { readinessScore } : {}),
      },
      create: {
        id: sessionId,
        targetRoleTitle: targetRole || null,
        currentSkills: JSON.stringify(currentSkills || []),
        readinessScore: typeof readinessScore === 'number' ? readinessScore : 0,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      targetRole: session.targetRoleTitle,
      updatedAt: session.updatedAt.toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('Session POST error:', err);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
