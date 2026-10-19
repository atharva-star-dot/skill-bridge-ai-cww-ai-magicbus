import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { executeGeminiWithRetry, getActiveModel } from '@/lib/ai/gemini';
import {
  StartInterviewInputSchema,
  GenerateQuestionsResponseSchema,
  GenerateQuestionsResponse,
} from '@/lib/schemas/interview.schema';
import { buildGenerateQuestionsPrompt } from '@/lib/ai/prompts/interview.prompt';
import { getFallbackQuestions } from '@/lib/ai/fallbacks/interview.fallback';
import { enforceAiRateLimit } from '@/lib/ai/rate-limit';

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
    const validation = StartInterviewInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { targetRole } = validation.data;
    const rateLimitResponse = await enforceAiRateLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    // Ensure profile exists in DB
    await prisma.profile.upsert({
      where: { id: userId },
      update: { targetRole },
      create: {
        id: userId,
        email: user.email,
        fullName: user.user_metadata?.full_name || null,
        targetRole,
        currentSkills: '[]',
        readinessScore: 0,
      },
    });

    // 1. Fetch missing skills from the active gap report for this role
    let missingSkills: string[] = [];
    try {
      const gapReport = await prisma.skillGapReport.findFirst({
        where: { userId, targetRole: { equals: targetRole } },
        orderBy: { createdAt: 'desc' },
      });
      if (gapReport?.missingSkills) {
        const parsed = JSON.parse(gapReport.missingSkills);
        missingSkills = parsed.map((m: any) => m.name);
      }
    } catch {}

    // 2. Fetch prior questions from previous interview sessions for this role to prevent duplicates
    const priorAnswers = await prisma.interviewAnswer.findMany({
      where: {
        interviewSession: {
          userId,
          targetRole: { equals: targetRole },
        },
      },
      select: { questionText: true },
    });
    const priorQuestions = Array.from(new Set(priorAnswers.map((a) => a.questionText)));

    // 3. Generate 5 questions (AI with fallback)
    let questionsResult: GenerateQuestionsResponse;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const startTime = performance.now();
      try {
        console.info(
          `[Interview:Start] Generating questions via Gemini (${getActiveModel()}) for role: ${targetRole}`
        );
        const prompt = buildGenerateQuestionsPrompt(targetRole, missingSkills, priorQuestions);
        const aiResult = await executeGeminiWithRetry(prompt, GenerateQuestionsResponseSchema);
        const durationMs = Math.round(performance.now() - startTime);
        console.info(`[Interview:Start] AI call completed in ${durationMs}ms`);
        questionsResult = { ...aiResult, source: 'ai' };
      } catch (aiErr: any) {
        const durationMs = Math.round(performance.now() - startTime);
        console.warn(
          `[Interview:Start] Gemini failed after ${durationMs}ms, using fallback questions:`,
          aiErr?.message
        );
        questionsResult = getFallbackQuestions(targetRole, missingSkills, priorQuestions);
      }
    } else {
      console.info('[Interview] No GEMINI_API_KEY — using fallback questions.');
      questionsResult = getFallbackQuestions(targetRole, missingSkills, priorQuestions);
    }

    // 4. Create InterviewSession and pre-create the 5 InterviewAnswer slots
    const sessionCreation = await prisma.$transaction(async (transaction) => {
      const [capacity] = await transaction.$queryRaw<Array<{ allowed: boolean }>>`
        SELECT public.can_start_interview(${userId}::uuid, 3) AS allowed
      `;

      if (!capacity?.allowed) return { atCapacity: true as const };

      const interviewSession = await transaction.interviewSession.create({
        data: {
          userId,
          targetRole,
          status: 'in_progress',
          currentQuestionIndex: 0,
          answers: {
            create: questionsResult.questions.map((q) => ({
              questionIndex: q.questionIndex,
              questionType: q.questionType,
              questionText: q.questionText,
            })),
          },
        },
        include: {
          answers: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      return { atCapacity: false as const, interviewSession };
    });

    if (sessionCreation.atCapacity) {
      return NextResponse.json(
        { error: 'Maximum number of in-progress interviews reached' },
        { status: 409 }
      );
    }

    const interviewSession = sessionCreation.interviewSession;

    return NextResponse.json(
      {
        success: true,
        interviewSession: {
          id: interviewSession.id,
          targetRole: interviewSession.targetRole,
          status: interviewSession.status,
          currentQuestionIndex: interviewSession.currentQuestionIndex,
          questions: interviewSession.answers.map((a) => ({
            id: a.id,
            questionIndex: a.questionIndex,
            questionType: a.questionType,
            questionText: a.questionText,
            userAnswer: a.userAnswer,
            score: a.score,
            feedback: a.feedback,
            sampleAnswer: a.sampleAnswer,
          })),
          source: questionsResult.source,
        },
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: any) {
    console.error('[Interview] Start POST error:', err);
    return NextResponse.json({ error: 'Failed to start interview session' }, { status: 500 });
  }
}
