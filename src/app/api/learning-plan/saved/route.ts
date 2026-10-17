import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  try {
    // Check if session has any gap report
    const gapReport = await prisma.skillGapReport.findFirst({ where: { sessionId } });
    if (!gapReport) {
      return NextResponse.json({ hasGapReport: false });
    }

    // Find latest plan with tasks
    const savedPlan = await prisma.learningPlan.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: { tasks: { orderBy: [{ weekNumber: 'asc' }] } },
    });

    if (!savedPlan) {
      return NextResponse.json({ hasGapReport: true });
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
    });
  } catch (err: any) {
    console.error('[SavedPlan] Error:', err);
    return NextResponse.json({ hasGapReport: true });
  }
}
