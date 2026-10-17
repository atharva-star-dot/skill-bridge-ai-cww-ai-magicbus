import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchBodySchema = z.object({
  isCompleted: z.boolean(),
  sessionId: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
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
    const validation = PatchBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { isCompleted } = validation.data;
    const { taskId } = params;

    // 1. Update task completion status
    const task = await prisma.planTask.update({
      where: { id: taskId },
      data: { isCompleted },
      include: { plan: true },
    });

    if (task.plan.userId !== userId) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 403 });
    }

    const planId = task.planId;
    const targetRole = task.plan.targetRole;

    // 2. Fetch all tasks in this plan to calculate completion %
    const allTasks = await prisma.planTask.findMany({ where: { planId } });
    const completedTasks = allTasks.filter((t) => t.isCompleted);
    const completionPercentage = Math.round((completedTasks.length / allTasks.length) * 100);

    await prisma.learningPlan.update({
      where: { id: planId },
      data: { completionPercentage },
    });

    // 3. Deterministic readiness recalculation
    let updatedReadiness: number | undefined;

    try {
      // Find latest base report for this role
      const latestReport = await prisma.skillGapReport.findFirst({
        where: { userId, targetRole },
        orderBy: { createdAt: 'desc' },
      });

      if (latestReport) {
        const baseScore = latestReport.readinessScore;

        // Parse missing skills to know priority of each skill
        const missingPriorityMap = new Map<string, number>();
        try {
          const missingItems: Array<{ name: string; priority: string }> = JSON.parse(
            latestReport.missingSkills || '[]'
          );
          for (const item of missingItems) {
            const w = item.priority === 'High' ? 3 : item.priority === 'Medium' ? 2 : 1;
            missingPriorityMap.set(item.name.toLowerCase(), w);
          }
        } catch {}

        // Calculate weighted task completion
        let totalTaskWeight = 0;
        let completedTaskWeight = 0;

        for (const t of allTasks) {
          let taskWeight = 2; // default Medium
          Array.from(missingPriorityMap.entries()).forEach(([skillName, w]) => {
            if (
              t.title.toLowerCase().includes(skillName) ||
              t.description.toLowerCase().includes(skillName)
            ) {
              taskWeight = Math.max(taskWeight, w);
            }
          });
          totalTaskWeight += taskWeight;
          if (t.isCompleted) {
            completedTaskWeight += taskWeight;
          }
        }

        const weightedProgress =
          totalTaskWeight > 0
            ? completedTaskWeight / totalTaskWeight
            : completedTasks.length / allTasks.length;

        // Deterministic linear progression bounded between baseScore and 95
        const potentialGain = 95 - baseScore;
        const newScore = Math.min(95, Math.round(baseScore + potentialGain * weightedProgress));

        await prisma.profile.update({
          where: { id: userId },
          data: { readinessScore: newScore },
        });

        updatedReadiness = newScore;
      }
    } catch (scoreErr) {
      console.warn('[TaskToggle] Readiness recalculation warning:', scoreErr);
    }

    return NextResponse.json(
      {
        taskId,
        isCompleted,
        completionPercentage,
        newReadiness: updatedReadiness,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error: any) {
    console.error('[TaskToggle] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}
