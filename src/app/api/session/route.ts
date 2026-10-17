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
        readinessScore: 0,
        activePlanSummary: null,
        updatedAt: new Date().toISOString(),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const currentRole = session.targetRoleTitle;

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

    return NextResponse.json({
      sessionId: session.id,
      targetRole: session.targetRoleTitle,
      currentSkills: parsedSkills,
      readinessScore: session.readinessScore,
      activePlanSummary,
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

    // Check if targetRole is changing
    const existingSession = await prisma.session.findUnique({ where: { id: sessionId } });
    const isRoleChanging = existingSession && targetRole && existingSession.targetRoleTitle !== targetRole;

    // If role changed, reset readinessScore to 0 or incoming score (not old boosted score)
    const effectiveReadinessScore = typeof readinessScore === 'number'
      ? readinessScore
      : isRoleChanging
      ? 0
      : existingSession?.readinessScore ?? 0;

    const session = await prisma.session.upsert({
      where: { id: sessionId },
      update: {
        ...(targetRole ? { targetRoleTitle: targetRole } : {}),
        ...(currentSkills ? { currentSkills: JSON.stringify(currentSkills) } : {}),
        readinessScore: effectiveReadinessScore,
      },
      create: {
        id: sessionId,
        targetRoleTitle: targetRole || null,
        currentSkills: JSON.stringify(currentSkills || []),
        readinessScore: effectiveReadinessScore,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      targetRole: session.targetRoleTitle,
      readinessScore: session.readinessScore,
      updatedAt: session.updatedAt.toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('Session POST error:', err);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
