import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeGeminiWithRetry, getActiveModel } from '@/lib/ai/gemini';
import {
  SubmitAnswerInputSchema,
  AnswerEvaluationSchema,
  AnswerEvaluation,
  QuestionType,
} from '@/lib/schemas/interview.schema';
import { buildEvaluateAnswerPrompt } from '@/lib/ai/prompts/interview.prompt';
import { evaluateAnswerFallback } from '@/lib/ai/fallbacks/interview.fallback';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = SubmitAnswerInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { sessionId, interviewSessionId, questionIndex, userAnswer } = validation.data;

    // 1. Verify session exists and is active
    const session = await prisma.interviewSession.findUnique({
      where: { id: interviewSessionId },
      include: {
        answers: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    if (!session || session.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Interview session not found or invalid' }, { status: 404 });
    }

    const targetAnswer = session.answers.find((a) => a.questionIndex === questionIndex);
    if (!targetAnswer) {
      return NextResponse.json({ error: `Question index ${questionIndex} not found` }, { status: 404 });
    }

    // 2. Evaluate answer (server-side Gemini or fallback). Do not log userAnswer raw text.
    let evaluation: AnswerEvaluation;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        console.info(
          `[Interview] Scoring answer for Q${questionIndex + 1} (${targetAnswer.questionType}) via Gemini (${getActiveModel()})`
        );
        const prompt = buildEvaluateAnswerPrompt(
          session.targetRole,
          targetAnswer.questionType,
          targetAnswer.questionText,
          userAnswer
        );
        const aiResult = await executeGeminiWithRetry(prompt, AnswerEvaluationSchema);
        evaluation = { ...aiResult, source: 'ai' };
      } catch (aiErr: any) {
        console.warn('[Interview] Gemini scoring failed, using deterministic fallback:', aiErr?.message);
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

    // 3. Persist the answer and feedback (feedback is stored as JSON string containing strengths and improvements)
    const feedbackPayload = JSON.stringify({
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
    });

    await prisma.interviewAnswer.update({
      where: { id: targetAnswer.id },
      data: {
        userAnswer,
        score: evaluation.score,
        feedback: feedbackPayload,
        sampleAnswer: evaluation.improvedSampleAnswer,
      },
    });

    // Update currentQuestionIndex in interviewSession
    const nextQuestionIndex = Math.min(5, questionIndex + 1);
    const isCompleted = nextQuestionIndex >= 5;

    await prisma.interviewSession.update({
      where: { id: interviewSessionId },
      data: {
        currentQuestionIndex: nextQuestionIndex,
        ...(isCompleted ? { status: 'completed' } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      evaluation: {
        score: evaluation.score,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        improvedSampleAnswer: evaluation.improvedSampleAnswer,
        source: evaluation.source,
      },
      nextQuestionIndex,
      isCompleted,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[Interview] Answer POST error:', err);
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}
