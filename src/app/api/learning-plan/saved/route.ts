import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  try {
    // 1. Get current session to know the active role
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.targetRoleTitle) {
      return NextResponse.json({ hasGapReport: false, activePlan: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const currentRole = session.targetRoleTitle;

    // 2. Check if a gap report exists for THIS specific active role
    const gapReport = await prisma.skillGapReport.findFirst({
      where: {
        sessionId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!gapReport) {
      // Role was changed but user has not run gap analysis for it yet
      return NextResponse.json({ hasGapReport: false, activePlan: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 3. Find the latest learning plan matching THIS active role
    const savedPlan = await prisma.learningPlan.findFirst({
      where: {
        sessionId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
      include: { tasks: { orderBy: [{ weekNumber: 'asc' }] } },
    });

    if (!savedPlan) {
      // User has a gap report for this role, but has not built a learning plan yet
      return NextResponse.json({ hasGapReport: true, targetRole: currentRole, activePlan: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Group tasks by week
    const weekMap = new Map<number, typeof savedPlan.tasks>();
    for (const task of savedPlan.tasks) {
      if (!weekMap.has(task.weekNumber)) weekMap.set(task.weekNumber, []);
      weekMap.get(task.weekNumber)!.push(task);
    }

    const weeks = Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNumber, tasks]) => ({
        weekNumber,
        theme: `Week ${weekNumber}`,
        focusSkills: [],
        tasks: tasks.map((t) => ({
          taskId: t.id,
          title: t.title,
          description: t.description,
          estimatedHours: t.estimatedHours,
          skillsCovered: [],
          resources: JSON.parse(t.resources || '[]'),
          isCompleted: t.isCompleted,
        })),
        miniProject: '',
      }));

    return NextResponse.json({
      planId: savedPlan.id,
      targetRole: savedPlan.targetRole,
      durationWeeks: savedPlan.durationWeeks,
      completionPercentage: savedPlan.completionPercentage,
      weeks,
      overallGoal: '',
      source: undefined,
      hasGapReport: true,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[SavedPlan] Error:', err);
    return NextResponse.json({ hasGapReport: false }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
