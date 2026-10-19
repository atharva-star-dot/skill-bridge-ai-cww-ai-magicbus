import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { SEED_ROLES } from '@/data/seed-roles';
import { computeReadiness } from '@/lib/scoring/compute-readiness';
import { textContainsSkill } from '@/lib/scoring/skill-matching';
import { safeJsonParse } from '@/lib/utils/safe-json';

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

    const ownedTask = await prisma.planTask.findFirst({
      where: { id: taskId, plan: { userId } },
      include: { plan: true },
    });

    if (!ownedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.planTask.findFirst({
        where: { id: taskId, plan: { userId } },
        include: { plan: true },
      });

      if (!task) return null;

      await tx.planTask.update({
        where: { id: taskId },
        data: { isCompleted },
      });

      const allTasks = await tx.planTask.findMany({ where: { planId: task.planId } });
      const completedTasks = allTasks.filter((item) => item.isCompleted);
      const completionPercentage = Math.round((completedTasks.length / allTasks.length) * 100);

      await tx.learningPlan.update({
        where: { id: task.planId },
        data: { completionPercentage },
      });

      let updatedReadiness: number | undefined;
      const latestReport = await tx.skillGapReport.findFirst({
        where: { userId, targetRole: task.plan.targetRole },
        orderBy: { createdAt: 'desc' },
      });

      if (latestReport) {
        const matchedSkills = safeJsonParse<string[]>(latestReport.matchedSkills, []);
        const missingSkills = safeJsonParse<
          Array<{ name: string; priority: 'High' | 'Medium' | 'Low' }>
        >(latestReport.missingSkills, []);
        const seedRole = SEED_ROLES.find(
          (role) =>
            role.title.toLowerCase() === task.plan.targetRole.toLowerCase() ||
            role.slug === task.plan.targetRole.toLowerCase()
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
        const missingPriorityMap = new Map(
          missingSkills.map((skill) => [
            skill.name.toLowerCase(),
            skill.priority === 'High' ? 3 : skill.priority === 'Medium' ? 2 : 1,
          ])
        );
        let totalTaskWeight = 0;
        let completedTaskWeight = 0;
        for (const item of allTasks) {
          let taskWeight = 2;
          for (const [skillName, weight] of Array.from(missingPriorityMap.entries())) {
            if (textContainsSkill(item.title, skillName) || textContainsSkill(item.description, skillName)) {
              taskWeight = Math.max(taskWeight, weight);
            }
          }
          totalTaskWeight += taskWeight;
          if (item.isCompleted) completedTaskWeight += taskWeight;
        }

        updatedReadiness = computeReadiness({
          benchmark,
          matchedSkills,
          missingSkills,
          taskProgress: {
            completedWeight: completedTaskWeight,
            totalWeight: totalTaskWeight,
          },
        });

        await tx.profile.update({
          where: { id: userId },
          data: { readinessScore: updatedReadiness },
        });
      }

      return { completionPercentage, updatedReadiness };
    });

    if (!result) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        taskId,
        isCompleted,
        completionPercentage: result.completionPercentage,
        newReadiness: result.updatedReadiness,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error: unknown) {
    console.error(
      '[TaskToggle] Request failed:',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
