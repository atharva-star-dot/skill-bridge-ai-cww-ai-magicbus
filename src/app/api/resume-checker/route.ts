import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { executeGeminiWithRetry, getActiveModel } from '@/lib/ai/gemini';
import {
  ResumeReviewInputSchema,
  ResumeReviewOutputSchema,
  ResumeReviewOutput,
} from '@/lib/schemas/resume-checker.schema';
import {
  buildResumeCheckerPrompt,
  RESUME_CHECKER_SYSTEM_INSTRUCTION,
} from '@/lib/ai/prompts/resume-checker.prompt';
import { generateFallbackResumeReview } from '@/lib/ai/fallbacks/resume-checker.fallback';
import { SEED_ROLES } from '@/data/seed-roles';
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

    // 1. Zod input validation (with 15,000 char check)
    const validation = ResumeReviewInputSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue ? firstIssue.message : 'Invalid request payload',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { resumeText, targetRole } = validation.data;
    const rateLimitResponse = await enforceAiRateLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Fetch seed benchmark skills or latest SkillGapReport skills for role
    const seedRole = SEED_ROLES.find(
      (r) =>
        r.title.toLowerCase() === targetRole.toLowerCase() ||
        r.slug === targetRole.toLowerCase()
    );
    const benchmarkSkills = seedRole
      ? [...seedRole.requiredSkills, ...seedRole.goodToHaveSkills]
      : [];

    // Check if user has a gap report to flag overlapping missing skills
    let roleMissingSkills: string[] = [];
    try {
      const gapReport = await prisma.skillGapReport.findFirst({
        where: { userId, targetRole },
        orderBy: { createdAt: 'desc' },
      });
      if (gapReport?.missingSkills) {
        const parsed = JSON.parse(gapReport.missingSkills);
        roleMissingSkills = parsed.map((m: any) => m.name.toLowerCase());
      }
    } catch {}

    let output: ResumeReviewOutput;

    // 3. AI analysis with fallback
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const startTime = performance.now();
      try {
        console.info(
          `[ResumeChecker] Analyzing resume via Gemini (${getActiveModel()}) for role: ${targetRole}`
        );
        const prompt = buildResumeCheckerPrompt(targetRole, resumeText, benchmarkSkills);
        const aiResult = await executeGeminiWithRetry(
          prompt,
          ResumeReviewOutputSchema,
          RESUME_CHECKER_SYSTEM_INSTRUCTION
        );
        const durationMs = Math.round(performance.now() - startTime);
        console.info(`[ResumeChecker] AI call completed in ${durationMs}ms`);
        output = { ...aiResult, source: 'ai' };
      } catch (aiError: any) {
        const durationMs = Math.round(performance.now() - startTime);
        console.warn(
          `[ResumeChecker] Gemini AI failed after ${durationMs}ms; using deterministic fallback.`,
          aiError instanceof Error ? aiError.name : 'UnknownError'
        );
        output = generateFallbackResumeReview(targetRole, resumeText, benchmarkSkills);
      }
    } else {
      console.info('[ResumeChecker] No GEMINI_API_KEY — using deterministic fallback.');
      output = generateFallbackResumeReview(targetRole, resumeText, benchmarkSkills);
    }
    output = {
      ...output,
      atsScore: Math.max(0, Math.min(100, Math.round(output.atsScore))),
    };

    // 4. Tag missing keywords that overlap with actual skill gaps
    const annotatedKeywords = output.missingKeywords.map((item) => ({
      ...item,
      isSkillGap: roleMissingSkills.some(
        (s) => s.includes(item.keyword.toLowerCase()) || item.keyword.toLowerCase().includes(s)
      ),
    }));

    const finalOutput = {
      ...output,
      missingKeywords: annotatedKeywords,
    };

    // 5. Persist review in database per user and targetRole (do not store raw resumeText)
    try {
      // Remove previous reviews for this specific role so only the latest is active
      await prisma.$transaction(async (transaction) => {
        await transaction.resumeReview.deleteMany({
          where: { userId, targetRole },
        });

        await transaction.resumeReview.create({
          data: {
            userId,
            targetRole,
            atsScore: finalOutput.atsScore,
            strengths: JSON.stringify(finalOutput.strengths),
            weaknesses: JSON.stringify(finalOutput.weaknesses),
            missingKeywords: JSON.stringify(finalOutput.missingKeywords),
            bulletRewrites: JSON.stringify(finalOutput.bulletRewrites),
          },
        });
      });
    } catch (dbError: unknown) {
      console.warn(
        '[ResumeChecker] Database save failed.',
        dbError instanceof Error ? dbError.name : 'UnknownError'
      );
    }

    return NextResponse.json(finalOutput, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    console.error(
      '[ResumeChecker] Request failed:',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred during resume review.' },
      { status: 500 }
    );
  }
}
