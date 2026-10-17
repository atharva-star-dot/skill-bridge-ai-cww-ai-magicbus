import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId query parameter is required' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        gapReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        learningPlans: { orderBy: { createdAt: 'desc' }, take: 1, include: { tasks: true } },
      },
    });

    if (!session) {
      return NextResponse.json({
        sessionId,
        targetRole: null,
        currentSkills: [],
        readinessScore: 0,
        activePlanSummary: null,
        updatedAt: new Date().toISOString(),
      });
    }

    let parsedSkills: string[] = [];
    try {
      parsedSkills = JSON.parse(session.currentSkills);
    } catch {}

    const latestPlan = session.learningPlans[0];
    const activePlanSummary = latestPlan
      ? {
          id: latestPlan.id,
          durationWeeks: latestPlan.durationWeeks,
          completedTasksCount: latestPlan.tasks.filter((t) => t.isCompleted).length,
          totalTasksCount: latestPlan.tasks.length,
          completionPercentage: latestPlan.completionPercentage,
        }
      : null;

    return NextResponse.json({
      sessionId: session.id,
      targetRole: session.targetRoleTitle,
      currentSkills: parsedSkills,
      readinessScore: session.readinessScore,
      activePlanSummary,
      updatedAt: session.updatedAt.toISOString(),
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

    return NextResponse.json({ success: true, sessionId: session.id, updatedAt: session.updatedAt.toISOString() });
  } catch (err: any) {
    console.error('Session POST error:', err);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
