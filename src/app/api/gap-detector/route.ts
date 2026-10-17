import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeGeminiWithRetry } from '@/lib/ai/gemini';
import { GapDetectorInputSchema, GapDetectorOutputSchema, GapDetectorOutput } from '@/lib/schemas/gap-detector.schema';
import { buildSkillGapPrompt } from '@/lib/ai/prompts/gap-detector.prompt';
import { SEED_ROLES } from '@/data/seed-roles';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = GapDetectorInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, targetRole, currentSkills, resumeText } = validation.data;

    // Check if target role matches a seed role to grab benchmark skills
    const seedRole = SEED_ROLES.find(
      (r) => r.title.toLowerCase() === targetRole.toLowerCase() || r.slug === targetRole.toLowerCase()
    );
    const benchmarkSkills = seedRole ? [...seedRole.requiredSkills, ...seedRole.goodToHaveSkills] : [];

    let output: GapDetectorOutput;

    // Check if API key is present; if not or if AI fails, use intelligent fallback
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        const prompt = buildSkillGapPrompt(targetRole, currentSkills, resumeText, benchmarkSkills);
        output = await executeGeminiWithRetry(prompt, GapDetectorOutputSchema);
      } catch (aiError: any) {
        console.warn('Gemini AI failed, using deterministic benchmark fallback:', aiError?.message);
        output = generateFallbackSkillGap(targetRole, currentSkills, seedRole);
      }
    } else {
      console.info('No GEMINI_API_KEY detected. Using deterministic benchmark generator.');
      output = generateFallbackSkillGap(targetRole, currentSkills, seedRole);
    }

    // Persist to Database if sessionId provided
    try {
      // Upsert Session
      await prisma.session.upsert({
        where: { id: sessionId },
        update: {
          targetRoleTitle: targetRole,
          currentSkills: JSON.stringify(currentSkills),
          readinessScore: output.readinessScore,
        },
        create: {
          id: sessionId,
          targetRoleTitle: targetRole,
          currentSkills: JSON.stringify(currentSkills),
          readinessScore: output.readinessScore,
        },
      });

      // Create SkillGapReport
      await prisma.skillGapReport.create({
        data: {
          sessionId,
          targetRole,
          readinessScore: output.readinessScore,
          matchedSkills: JSON.stringify(output.matchedSkills),
          missingSkills: JSON.stringify(output.missingSkills),
          summary: output.summary,
        },
      });
    } catch (dbError) {
      console.warn('Database save warning (proceeding with response):', dbError);
    }

    return NextResponse.json(output, { status: 200 });
  } catch (error: any) {
    console.error('Skill Gap Detection Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred during skill gap analysis.' },
      { status: 500 }
    );
  }
}

// Fallback logic adhering to Constitution Principle III: Fault Isolation
function generateFallbackSkillGap(
  targetRole: string,
  userSkills: string[],
  seedRole?: (typeof SEED_ROLES)[0]
): GapDetectorOutput {
  const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim()).filter(Boolean);
  const benchmarkReq = seedRole ? seedRole.requiredSkills : ['Core Problem Solving', 'Git / GitHub', 'System Basics', 'Unit Testing', 'Communication'];
  const benchmarkGood = seedRole ? seedRole.goodToHaveSkills : ['Cloud Deployment', 'Clean Architecture', 'CI/CD'];

  const allReq = [...benchmarkReq, ...benchmarkGood];
  const matchedSkills: string[] = [];
  const missingSkills: GapDetectorOutput['missingSkills'] = [];

  for (const skill of allReq) {
    const lower = skill.toLowerCase();
    const isMatched = normalizedUserSkills.some(
      (userSkill) => lower.includes(userSkill) || userSkill.includes(lower)
    );

    if (isMatched) {
      matchedSkills.push(skill);
    } else {
      const isCore = benchmarkReq.includes(skill);
      missingSkills.push({
        name: skill,
        priority: isCore ? 'High' : 'Medium',
        reason: isCore
          ? `Fundamental prerequisite for entry-level ${targetRole} positions.`
          : `Important differentiator that sets top candidates apart.`,
        category: isCore ? 'Core Technical' : 'Tool / Framework',
      });
    }
  }

  const total = allReq.length || 1;
  const rawScore = Math.round((matchedSkills.length / total) * 100);
  const readinessScore = Math.max(15, Math.min(95, rawScore));

  return {
    targetRole,
    readinessScore,
    requiredSkills: allReq,
    matchedSkills,
    missingSkills,
    summary: `You match ${matchedSkills.length} out of ${total} core skills for ${targetRole}. Focus on the ${missingSkills.filter((m) => m.priority === 'High').length} High Priority competencies first to accelerate your job readiness.`,
  };
}
