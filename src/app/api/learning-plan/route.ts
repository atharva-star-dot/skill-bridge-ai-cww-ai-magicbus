import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { executeGeminiWithRetry, getActiveModel } from '@/lib/ai/gemini';
import { LearningPlanInputSchema, LearningPlanOutputSchema, LearningPlanOutput } from '@/lib/schemas/learning-plan.schema';
import { buildLearningPlanPrompt } from '@/lib/ai/prompts/learning-plan.prompt';
import { generateFallbackLearningPlan } from '@/lib/ai/fallbacks/learning-plan.fallback';
import type { MissingSkillItem } from '@/lib/schemas/gap-detector.schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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
    const validation = LearningPlanInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { durationWeeks } = validation.data;

    // 1. Fetch current profile to know the ACTIVE role
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile || !profile.targetRole) {
      return NextResponse.json(
        { error: 'No active target role found for this user. Please complete onboarding first.' },
        { status: 404 }
      );
    }

    const currentRole = profile.targetRole;

    // 2. Fetch the latest SkillGapReport specifically matching this user AND active targetRole
    const latestReport = await prisma.skillGapReport.findFirst({
      where: {
        userId,
        targetRole: { equals: currentRole },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestReport) {
      return NextResponse.json(
        { error: `No skill gap report found for ${currentRole}. Please run the Skill Gap Detector first.` },
        { status: 404 }
      );
    }

    const missingSkills: MissingSkillItem[] = JSON.parse(latestReport.missingSkills || '[]');
    const matchedSkills: string[] = JSON.parse(latestReport.matchedSkills || '[]');
    const targetRole = latestReport.targetRole;

    if (missingSkills.length === 0) {
      const emptyPlan: LearningPlanOutput = {
        targetRole,
        durationWeeks,
        weeks: [
          {
            weekNumber: 1,
            theme: 'Portfolio Polish & Interview Prep',
            focusSkills: matchedSkills.slice(0, 3),
            tasks: [
              {
                title: 'Polish your top 3 GitHub projects',
                description: 'Write clear README files, add demo screenshots, and ensure each project runs cleanly.',
                estimatedHours: 4,
                skillsCovered: matchedSkills.slice(0, 2),
                resources: [
                  { title: 'How to Write a Good README', url: 'https://www.freecodecamp.org/news/how-to-write-a-good-readme-file/', type: 'article' },
                ],
              },
              {
                title: 'Build interview talking points',
                description: 'Prepare STAR stories for each of your matched skills.',
                estimatedHours: 3,
                skillsCovered: matchedSkills.slice(0, 2),
                resources: [],
              },
              {
                title: 'Complete a mock code challenge',
                description: 'Solve 2 realistic role-related coding exercises.',
                estimatedHours: 3,
                skillsCovered: matchedSkills.slice(0, 2),
                resources: [],
              },
            ],
            miniProject: `Build and deploy a capstone portfolio project showcasing your ${targetRole} capabilities`,
          },
        ],
        overallGoal: `You already have strong skills for ${targetRole}! This plan sharpens your portfolio and interview readiness.`,
        source: 'fallback',
      };
      return NextResponse.json(emptyPlan, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    // ── AI path ─────────────────────────────────────────────────────────────
    let output: LearningPlanOutput;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const startTime = performance.now();
      try {
        console.info(`[LearningPlan] Generating plan via Gemini (${getActiveModel()}) for role: ${targetRole}`);
        const prompt = buildLearningPlanPrompt(targetRole, missingSkills, matchedSkills, durationWeeks);
        const aiResult = await executeGeminiWithRetry(prompt, LearningPlanOutputSchema);
        const durationMs = Math.round(performance.now() - startTime);
        console.info(`[LearningPlan] AI call completed in ${durationMs}ms`);
        output = { ...aiResult, durationWeeks, source: 'ai' };
      } catch (aiError: any) {
        const durationMs = Math.round(performance.now() - startTime);
        console.warn(`[LearningPlan] Gemini failed after ${durationMs}ms, using fallback:`, aiError?.message);
        output = generateFallbackLearningPlan(targetRole, missingSkills, matchedSkills, durationWeeks);
      }
    } else {
      console.info('[LearningPlan] No GEMINI_API_KEY — using deterministic fallback.');
      output = generateFallbackLearningPlan(targetRole, missingSkills, matchedSkills, durationWeeks);
    }

    // ── Persist to DB ────────────────────────────────────────────────────────
    try {
      // Delete any previous plan for THIS specific role (so re-generating gives a fresh plan)
      await prisma.learningPlan.deleteMany({
        where: { userId, targetRole },
      });

      const plan = await prisma.learningPlan.create({
        data: {
          userId,
          targetRole,
          durationWeeks,
          completionPercentage: 0,
          tasks: {
            create: output.weeks.flatMap((week) =>
              week.tasks.map((task) => ({
                weekNumber: week.weekNumber,
                title: task.title,
                description: task.description,
                estimatedHours: task.estimatedHours,
                isCompleted: false,
                resources: JSON.stringify(task.resources),
              }))
            ),
          },
        },
        include: { tasks: true },
      });

      // Attach DB task IDs to output so client can toggle them
      const taskIdMap = new Map<string, string>();
      for (const dbTask of plan.tasks) {
        taskIdMap.set(`${dbTask.weekNumber}:${dbTask.title}`, dbTask.id);
      }

      return NextResponse.json(
        {
          ...output,
          planId: plan.id,
          weeks: output.weeks.map((week) => ({
            ...week,
            tasks: week.tasks.map((task) => ({
              ...task,
              taskId: taskIdMap.get(`${week.weekNumber}:${task.title}`) ?? null,
              isCompleted: false,
            })),
          })),
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (dbError: any) {
      console.warn('[LearningPlan] DB save failed (returning in-memory plan):', dbError?.message);
      return NextResponse.json(output, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (error: any) {
    console.error('[LearningPlan] Unexpected error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred generating the learning plan.' },
      { status: 500 }
    );
  }
}
