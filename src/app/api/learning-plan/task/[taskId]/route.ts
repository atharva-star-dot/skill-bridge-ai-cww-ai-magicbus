import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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

    // 1. Update task completion status
    const task = await prisma.planTask.update({
      where: { id: taskId },
      data: { isCompleted },
      include: { plan: true },
    });

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
    // Formula:
    //   readinessScore = Math.min(95, Math.round(baseGapScore + (100 - baseGapScore) * weightedTaskCompletion * 0.90))
    // Where:
    //   - baseGapScore = the honest readiness score from the latest SkillGapReport for this role
    //   - weightedTaskCompletion = sum(weight[completedTask]) / sum(weight[allTasks])
    //   - weights are assigned based on task priority (High = 3, Medium = 2, Low = 1)
    //   - Maximum ceiling is 95 to leave headroom for interview & portfolio performance
    let updatedReadiness: number | undefined;

    try {
      // Find latest base report for this role
      const latestReport = await prisma.skillGapReport.findFirst({
        where: { sessionId, targetRole },
        orderBy: { createdAt: 'desc' },
      });

      if (latestReport) {
        const baseScore = latestReport.readinessScore;

        // Parse missing skills to know priority of each skill
        let missingPriorityMap = new Map<string, number>();
        try {
          const missingItems: Array<{ name: string; priority: string }> = JSON.parse(latestReport.missingSkills || '[]');
          for (const item of missingItems) {
            const w = item.priority === 'High' ? 3 : item.priority === 'Medium' ? 2 : 1;
            missingPriorityMap.set(item.name.toLowerCase(), w);
          }
        } catch {}

        // Calculate weighted task completion
        let totalTaskWeight = 0;
        let completedTaskWeight = 0;

        for (const t of allTasks) {
          // Identify weight based on title keywords matching missing skills
          let taskWeight = 2; // default Medium
          Array.from(missingPriorityMap.entries()).forEach(([skillName, w]) => {
            if (t.title.toLowerCase().includes(skillName) || t.description.toLowerCase().includes(skillName)) {
              taskWeight = Math.max(taskWeight, w);
            }
          });
          totalTaskWeight += taskWeight;
          if (t.isCompleted) {
            completedTaskWeight += taskWeight;
          }
        }

        const weightedProgress = totalTaskWeight > 0 ? (completedTaskWeight / totalTaskWeight) : (completedTasks.length / allTasks.length);

        // Deterministic linear progression bounded between baseScore and 95
        const potentialGain = 95 - baseScore;
        const newScore = Math.min(95, Math.round(baseScore + potentialGain * weightedProgress));

        await prisma.session.update({
          where: { id: sessionId },
          data: { readinessScore: newScore },
        });

        updatedReadiness = newScore;
      }
    } catch (scoreErr) {
      console.warn('[TaskToggle] Readiness recalculation warning:', scoreErr);
    }

    return NextResponse.json({
      taskId,
      isCompleted,
      completionPercentage,
      newReadiness: updatedReadiness,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[TaskToggle] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update task' }, { status: 500 });
  }
}
