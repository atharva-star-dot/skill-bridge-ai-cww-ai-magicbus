import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeGeminiWithRetry, getActiveModel } from '@/lib/ai/gemini';
import {
  GenerateSummaryInputSchema,
  InterviewSummarySchema,
  InterviewSummary,
  QuestionType,
  PerQuestionScoreItem,
} from '@/lib/schemas/interview.schema';
import { buildSummaryPrompt } from '@/lib/ai/prompts/interview.prompt';
import { generateSummaryFallback } from '@/lib/ai/fallbacks/interview.fallback';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const AISummaryResponseSchema = z.object({
  topStrengths: z.array(z.string()).min(1),
  topWeaknesses: z.array(z.string()).min(1),
  recommendedNextSteps: z.array(
    z.object({
      step: z.string(),
      skill: z.string().optional(),
    })
  ).min(1),
  source: z.enum(['ai', 'fallback']).default('ai'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = GenerateSummaryInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { sessionId, interviewSessionId } = validation.data;

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

    // Prepare perQuestionScores
    const perQuestionScores: PerQuestionScoreItem[] = session.answers.map((a) => {
      let parsedFeedback = '';
      try {
        if (a.feedback) {
          const f = JSON.parse(a.feedback);
          parsedFeedback = Array.isArray(f.improvements) ? f.improvements.join('; ') : String(a.feedback);
        }
      } catch {
        parsedFeedback = a.feedback || '';
      }

      return {
        questionIndex: a.questionIndex,
        questionType: a.questionType as QuestionType,
        questionText: a.questionText,
        userAnswer: a.userAnswer,
        score: a.score ?? 5,
        feedback: parsedFeedback,
        sampleAnswer: a.sampleAnswer || undefined,
      };
    });

    // 1. Calculate overallScore strictly in code (average of question scores)
    const totalScore = perQuestionScores.reduce((acc, q) => acc + q.score, 0);
    const overallScore = Math.round((totalScore / Math.max(1, perQuestionScores.length)) * 10) / 10;

    // 2. Fetch missing skills from gap report for recommendations
    let missingSkills: string[] = [];
    try {
      const gapReport = await prisma.skillGapReport.findFirst({
        where: { sessionId, targetRole: { equals: session.targetRole } },
        orderBy: { createdAt: 'desc' },
      });
      if (gapReport?.missingSkills) {
        const parsed = JSON.parse(gapReport.missingSkills);
        missingSkills = parsed.map((m: any) => m.name);
      }
    } catch {}

    // 3. AI synthesis with fallback
    let summaryData: {
      topStrengths: string[];
      topWeaknesses: string[];
      recommendedNextSteps: Array<{ step: string; skill?: string }>;
      source: 'ai' | 'fallback';
    };

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const startTime = performance.now();
      try {
        console.info(`[Interview:Summary] Generating summary via Gemini (${getActiveModel()}) for role: ${session.targetRole}`);
        const prompt = buildSummaryPrompt(session.targetRole, perQuestionScores, missingSkills);
        const aiResult = await executeGeminiWithRetry(prompt, AISummaryResponseSchema);
        const durationMs = Math.round(performance.now() - startTime);
        console.info(`[Interview:Summary] AI summary completed in ${durationMs}ms`);
        summaryData = { ...aiResult, source: 'ai' };
      } catch (aiErr: any) {
        const durationMs = Math.round(performance.now() - startTime);
        console.warn(`[Interview:Summary] Gemini summary failed after ${durationMs}ms, using fallback:`, aiErr?.message);
        const fallback = generateSummaryFallback(session.targetRole, perQuestionScores, missingSkills);
        summaryData = {
          topStrengths: fallback.topStrengths,
          topWeaknesses: fallback.topWeaknesses,
          recommendedNextSteps: fallback.recommendedNextSteps,
          source: 'fallback',
        };
      }
    } else {
      console.info('[Interview] No GEMINI_API_KEY — using fallback summary.');
      const fallback = generateSummaryFallback(session.targetRole, perQuestionScores, missingSkills);
      summaryData = {
        topStrengths: fallback.topStrengths,
        topWeaknesses: fallback.topWeaknesses,
        recommendedNextSteps: fallback.recommendedNextSteps,
        source: 'fallback',
      };
    }

    const finalSummary: InterviewSummary = {
      overallScore,
      perQuestionScores,
      topStrengths: summaryData.topStrengths,
      topWeaknesses: summaryData.topWeaknesses,
      recommendedNextSteps: summaryData.recommendedNextSteps,
      source: summaryData.source,
    };

    // 4. Save summary JSON to InterviewSession and mark completed
    await prisma.interviewSession.update({
      where: { id: interviewSessionId },
      data: {
        status: 'completed',
        summary: JSON.stringify(finalSummary),
      },
    });

    return NextResponse.json({
      success: true,
      summary: finalSummary,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[Interview] Summary POST error:', err);
    return NextResponse.json({ error: 'Failed to generate interview summary' }, { status: 500 });
  }
}
