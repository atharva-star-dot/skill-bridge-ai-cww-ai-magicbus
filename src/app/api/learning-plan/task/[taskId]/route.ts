import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const PatchBodySchema = z.object({
  isCompleted: z.boolean(),
  sessionId: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const body = await req.json();
    const validation = PatchBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 });
    }

    const { isCompleted, sessionId } = validation.data;
    const { taskId } = params;

    // Update the task
    const task = await prisma.planTask.update({
      where: { id: taskId },
      data: { isCompleted },
    });

    // Recalculate plan completion %
    const allTasks = await prisma.planTask.findMany({ where: { planId: task.planId } });
    const completedCount = allTasks.filter((t) => t.isCompleted).length;
    const completionPercentage = Math.round((completedCount / allTasks.length) * 100);

    await prisma.learningPlan.update({
      where: { id: task.planId },
      data: { completionPercentage },
    });

    // Update session readiness score based on completion progress.
    // Formula: readiness += completionPercentage × (1 - baseReadiness/100) × 0.4
    // i.e. completing the full plan can boost readiness by up to 40 points.
    let updatedReadiness: number | undefined;
    try {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (session) {
        const baseScore = session.readinessScore ?? 0;
        // Boost = up to 40 points proportional to plan completion
        const boost = Math.round(completionPercentage * 0.4);
        const newScore = Math.min(98, baseScore + boost);
        await prisma.session.update({
          where: { id: sessionId },
          data: { readinessScore: newScore },
        });
        updatedReadiness = newScore;
      }
    } catch (scoreErr) {
      console.warn('[TaskToggle] Could not update readiness score:', scoreErr);
    }

    return NextResponse.json({
      taskId,
      isCompleted,
      completionPercentage,
      newReadiness: updatedReadiness,
    });
  } catch (error: any) {
    console.error('[TaskToggle] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update task' }, { status: 500 });
  }
}
