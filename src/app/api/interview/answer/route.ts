import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { executeGeminiWithRetry, getActiveModel } from '@/lib/ai/gemini';
import {
  SubmitAnswerInputSchema,
  AnswerEvaluationSchema,
  AnswerEvaluation,
  QuestionType,
} from '@/lib/schemas/interview.schema';
import {
  buildEvaluateAnswerPrompt,
  INTERVIEW_EVALUATION_SYSTEM_INSTRUCTION,
} from '@/lib/ai/prompts/interview.prompt';
import { evaluateAnswerFallback } from '@/lib/ai/fallbacks/interview.fallback';
import { hasFiveScoredAnswers } from '@/lib/interview/completion';
import { enforceAiRateLimit } from '@/lib/ai/rate-limit';
import { logServerError } from '@/lib/logging/server-error';

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
    const validation = SubmitAnswerInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { interviewSessionId, questionIndex, userAnswer } = validation.data;

    // 1. Verify session exists and belongs to this user
    const session = await prisma.interviewSession.findUnique({
      where: { id: interviewSessionId },
      include: {
        answers: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Interview session not found or invalid' }, { status: 404 });
    }

    if (
      session.status !== 'in_progress' ||
      session.currentQuestionIndex !== questionIndex
    ) {
      return NextResponse.json({ error: 'Question is out of order or already answered' }, { status: 409 });
    }

    const targetAnswer = session.answers.find((a) => a.questionIndex === questionIndex);
    if (!targetAnswer) {
      return NextResponse.json({ error: `Question index ${questionIndex} not found` }, { status: 404 });
    }
    if (targetAnswer.userAnswer !== null || targetAnswer.score !== null) {
      return NextResponse.json({ error: 'Question is out of order or already answered' }, { status: 409 });
    }
    const rateLimitResponse = await enforceAiRateLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Evaluate answer (server-side Gemini or fallback). Do not log userAnswer raw text.
    let evaluation: AnswerEvaluation;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const startTime = performance.now();
      try {
        console.info(
          `[Interview:Answer] Scoring answer for Q${questionIndex + 1} (${targetAnswer.questionType}) via Gemini (${getActiveModel()})`
        );
        const prompt = buildEvaluateAnswerPrompt(
          session.targetRole,
          targetAnswer.questionType,
          targetAnswer.questionText,
          userAnswer
        );
        const aiResult = await executeGeminiWithRetry(
          prompt,
          AnswerEvaluationSchema,
          INTERVIEW_EVALUATION_SYSTEM_INSTRUCTION
        );
        const durationMs = Math.round(performance.now() - startTime);
        console.info(`[Interview:Answer] AI scoring completed in ${durationMs}ms`);
        evaluation = { ...aiResult, source: 'ai' };
      } catch (aiErr: any) {
        const durationMs = Math.round(performance.now() - startTime);
        logServerError('interview_answer.gemini', aiErr, {
          route: '/api/interview/answer',
          userId,
          elapsedMs: durationMs,
          extra: { fallback: true },
        });
        evaluation = evaluateAnswerFallback(
          session.targetRole,
          targetAnswer.questionType as QuestionType,
          targetAnswer.questionText,
          userAnswer
        );
      }
    } else {
      console.info('[Interview] No GEMINI_API_KEY — using deterministic evaluation fallback.');
      evaluation = evaluateAnswerFallback(
        session.targetRole,
        targetAnswer.questionType as QuestionType,
        targetAnswer.questionText,
        userAnswer
      );
    }
    evaluation = {
      ...evaluation,
      score: Math.max(1, Math.min(10, Math.round(evaluation.score))),
    };

    // 3. Persist the answer and feedback (feedback is stored as JSON string containing strengths and improvements)
    const feedbackPayload = JSON.stringify({
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
    });

    const updateResult = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT id
        FROM public.interview_sessions
        WHERE id = ${interviewSessionId}::uuid
        FOR UPDATE
      `;

      const currentSession = await transaction.interviewSession.findUnique({
        where: { id: interviewSessionId },
        include: {
          answers: {
            orderBy: { questionIndex: 'asc' },
          },
        },
      });

      if (!currentSession || currentSession.userId !== userId) {
        return { status: 404 as const };
      }

      const answerToUpdate = currentSession.answers.find(
        (answer) => answer.questionIndex === questionIndex
      );
      if (
        currentSession.status !== 'in_progress' ||
        currentSession.currentQuestionIndex !== questionIndex ||
        !answerToUpdate ||
        answerToUpdate.userAnswer !== null ||
        answerToUpdate.score !== null
      ) {
        return { status: 409 as const };
      }

      await transaction.interviewAnswer.update({
        where: { id: answerToUpdate.id },
        data: {
          userAnswer,
          score: evaluation.score,
          feedback: feedbackPayload,
          sampleAnswer: evaluation.improvedSampleAnswer,
        },
      });

      const nextQuestionIndex = Math.min(5, questionIndex + 1);
      const answersAfterUpdate = currentSession.answers.map((answer) =>
        answer.questionIndex === questionIndex
          ? { ...answer, score: evaluation.score }
          : answer
      );
      const isCompleted =
        nextQuestionIndex === 5 && hasFiveScoredAnswers(answersAfterUpdate);

      await transaction.interviewSession.update({
        where: { id: interviewSessionId },
        data: {
          currentQuestionIndex: nextQuestionIndex,
          ...(isCompleted ? { status: 'completed' } : {}),
        },
      });

      return { status: 200 as const, nextQuestionIndex, isCompleted };
    });

    if (updateResult.status === 404) {
      return NextResponse.json({ error: 'Interview session not found or invalid' }, { status: 404 });
    }
    if (updateResult.status === 409) {
      return NextResponse.json({ error: 'Question is out of order or already answered' }, { status: 409 });
    }

    return NextResponse.json(
      {
        success: true,
        evaluation: {
          score: evaluation.score,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          improvedSampleAnswer: evaluation.improvedSampleAnswer,
          source: evaluation.source,
        },
        nextQuestionIndex: updateResult.nextQuestionIndex,
        isCompleted: updateResult.isCompleted,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: unknown) {
    logServerError('interview_answer.request', err, {
      route: '/api/interview/answer',
    });
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}
