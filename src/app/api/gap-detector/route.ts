import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeGeminiWithRetry } from '@/lib/ai/gemini';
import { GapDetectorInputSchema, GapDetectorOutputSchema, GapDetectorOutput } from '@/lib/schemas/gap-detector.schema';
import { buildSkillGapPrompt } from '@/lib/ai/prompts/gap-detector.prompt';
import { SEED_ROLES } from '@/data/seed-roles';
import { hashSkills } from '@/lib/utils/role-key';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─── Priority weights for readiness score ────────────────────────────────────
// Formula: readinessScore = (Σ weight of matched skills) / (Σ weight of all required skills) × 100
// Weights: High = 3, Medium = 2, Low = 1
// High-priority skills count 3× as much because they are dealbreakers in fresher hiring.
const PRIORITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

const SKILL_REASON_LOOKUP: Record<string, string> = {
  // Frontend
  'HTML5': 'Every frontend role requires semantic HTML5 for accessibility and SEO — it is the first thing interviewers check.',
  'CSS3': 'CSS3 layouts (Flexbox, Grid) are tested in every UI screening; pixel-perfect styling is non-negotiable.',
  'JavaScript': 'JavaScript is the language of the web; all frontend logic depends on it.',
  'React': 'React is the dominant UI library in Indian product startups and service companies alike.',
  'TypeScript': 'TypeScript prevents the class of runtime bugs most common in large React codebases; 80 % of mid-size orgs mandate it.',
  'Tailwind CSS': 'Tailwind is now the default utility-first CSS framework across Next.js and React projects.',
  'Git': 'Git is a hard requirement on day 1 of any software job — commit history and branching are evaluated in every hiring round.',
  'Next.js': 'Next.js is the leading full-stack React framework; fresher JDs increasingly list it as a must-have.',
  'Redux / Zustand': 'State management libraries are essential for building non-trivial multi-component React apps.',
  'REST APIs': 'Frontend engineers must integrate REST APIs; inability to do so is an immediate disqualifier.',
  'Unit Testing (Jest/Vitest)': 'Automated tests are mandatory in agile teams; freshers who can write unit tests stand out.',
  'Web Accessibility (a11y)': 'WCAG compliance is required in enterprise and government projects; increasingly in FAANG-style interviews.',
  // React
  'JavaScript (ES6+)': 'Modern ES6+ syntax (arrow functions, destructuring, async/await) is fundamental to any React codebase.',
  'React Hooks': 'Hooks replaced class components; all React roles require fluency with useState, useEffect, and custom hooks.',
  'JSX/TSX': 'JSX is how React renders UIs; every React developer writes JSX daily.',
  'CSS / Tailwind': 'Styling is inseparable from React development; Tailwind has become the default choice in 2024+.',
  'Git & GitHub': 'PR-based collaboration on GitHub is the industry standard; no team skips version control.',
  'React Query / TanStack': 'Server-state management with React Query reduces boilerplate and is listed in 60 %+ of senior React JDs.',
  'Axios / Fetch API': 'HTTP client fluency is essential for connecting React apps to any backend.',
  'Vite': 'Vite replaced Create React App as the go-to build tool; most new projects use it.',
  // Backend Node
  'Node.js': 'Node.js is the runtime for all JavaScript backend work; without it you cannot run server code.',
  'Express.js': 'Express is the most widely used Node.js framework in Indian startups for REST API development.',
  'JavaScript / TypeScript': 'Dual-language fluency lets you contribute to both frontend and backend in full-stack teams.',
  'PostgreSQL / MySQL': 'Relational databases are at the core of nearly every production backend; SQL is a non-negotiable skill.',
  'RESTful API Design': 'Designing clean REST endpoints following HTTP conventions is assessed in every backend interview.',
  'Prisma ORM': 'Prisma provides type-safe DB queries and is the default ORM in the TypeScript/Node.js ecosystem.',
  'Redis Caching': 'Caching dramatically improves performance; Redis literacy separates mid-level candidates from juniors.',
  'Docker Basics': 'Docker is the standard for containerizing services; DevOps-aware freshers are preferred by employers.',
  'JWT Authentication': 'Stateless auth with JWT is required in any API that has user accounts.',
  // Python
  'Python 3': 'Python is the top language for backend, data, and AI roles; a fresher without Python is at a severe disadvantage.',
  'FastAPI or Django': 'FastAPI and Django are the two dominant Python web frameworks; employers expect proficiency in at least one.',
  'SQL (PostgreSQL)': 'Structured data querying is essential for backend developers; PostgreSQL is the most common production DB.',
  'Pydantic / Zod': 'Schema validation is critical for API correctness; Pydantic is required when working with FastAPI.',
  'Celery / Task Queues': 'Async task processing is required in production systems; Celery expertise is a strong differentiator.',
  'Pytest': 'Unit and integration testing with Pytest is mandatory in quality-conscious Python teams.',
  'AsyncIO': 'Async programming is essential for high-throughput FastAPI services.',
  // Java Spring
  'Core Java (OOP, Collections)': 'Core Java is the foundation of enterprise backend development; interviewers heavily test OOP and Collections.',
  'Spring Boot': 'Spring Boot is the dominant Java framework in Indian enterprises; it is listed in 90 %+ of Java JDs.',
  'Hibernate / JPA': 'ORM fluency is essential for database interactions in Spring applications.',
  'SQL / MySQL': 'MySQL is the most common relational DB in Java enterprise stacks; SQL is tested in every round.',
  'Maven or Gradle': 'Build tool proficiency is expected from day 1; Maven is the standard in most enterprise shops.',
  'Microservices Basics': 'Modern enterprise architectures are microservices-based; understanding them is critical for career growth.',
  // Data
  'SQL (Joins, Aggregations)': 'Complex SQL queries are tested in every data analyst interview; this is the single most important skill.',
  'Python (Pandas, NumPy)': 'Pandas and NumPy are required for data wrangling; analysts who cannot use them are filtered out early.',
  'Excel / Google Sheets': 'Spreadsheet proficiency is the baseline for any analyst role; stakeholders expect polished deliverables.',
  'Data Visualization (PowerBI / Tableau)': 'BI tools translate raw data into business decisions; dashboarding skills are evaluated in every DA interview.',
  'Scikit-Learn': 'Scikit-Learn is the standard ML library for classification, regression, and clustering in Python.',
  'Pandas & NumPy': 'Data manipulation is the most time-consuming part of any ML project; fluency here is essential.',
  'Statistics & Probability': 'Probability and statistics are the theoretical backbone of every ML algorithm.',
  'Jupyter Notebooks': 'Notebooks are the universal environment for data exploration and presenting model results.',
};

function getSkillReason(skillName: string, isCore: boolean, targetRole: string): string {
  if (SKILL_REASON_LOOKUP[skillName]) return SKILL_REASON_LOOKUP[skillName];
  const found = Object.keys(SKILL_REASON_LOOKUP).find((k) =>
    skillName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(skillName.toLowerCase())
  );
  if (found && SKILL_REASON_LOOKUP[found]) return SKILL_REASON_LOOKUP[found];
  if (isCore) return `${skillName} is a core requirement for entry-level ${targetRole} positions; recruiters screen for it in every round.`;
  return `${skillName} is a valued differentiator that sets shortlisted ${targetRole} candidates apart from the crowd.`;
}

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

    // ── AI path ──────────────────────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      const startTime = performance.now();
      try {
        const prompt = buildSkillGapPrompt(targetRole, currentSkills, resumeText, benchmarkSkills);
        const aiResult = await executeGeminiWithRetry(prompt, GapDetectorOutputSchema);
        const durationMs = Math.round(performance.now() - startTime);
        console.info(`[GapDetector] AI call completed in ${durationMs}ms`);
        output = {
          ...aiResult,
          readinessScore: computeWeightedScore(aiResult.matchedSkills, aiResult.missingSkills, aiResult.requiredSkills),
          source: 'ai',
        };
      } catch (aiError: any) {
        const durationMs = Math.round(performance.now() - startTime);
        console.warn(`[GapDetector] Gemini AI failed after ${durationMs}ms, using deterministic benchmark fallback:`, aiError?.message);
        output = generateFallbackSkillGap(targetRole, currentSkills, seedRole);
      }
    } else {
      console.info('No GEMINI_API_KEY detected. Using deterministic benchmark generator.');
      output = generateFallbackSkillGap(targetRole, currentSkills, seedRole);
    }

    // ── Persist to Database ────────────────────────────────────────────────────
    try {
      // 1. Upsert Session with the fresh, un-boosted readiness score for this role
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

      // 2. Insert new SkillGapReport for this role with skillsHash
      const sHash = hashSkills(currentSkills);
      await prisma.skillGapReport.create({
        data: {
          sessionId,
          targetRole,
          skillsHash: sHash,
          readinessScore: output.readinessScore,
          matchedSkills: JSON.stringify(output.matchedSkills),
          missingSkills: JSON.stringify(output.missingSkills),
          summary: output.summary,
        },
      });
    } catch (dbError) {
      console.warn('Database save warning (proceeding with response):', dbError);
    }

    return NextResponse.json(output, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error: any) {
    console.error('Skill Gap Detection Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred during skill gap analysis.' },
      { status: 500 }
    );
  }
}

// ─── Weighted readiness score ─────────────────────────────────────────────────
function computeWeightedScore(
  matchedSkills: string[],
  missingSkills: GapDetectorOutput['missingSkills'],
  requiredSkills: string[]
): number {
  const matchedSet = new Set(matchedSkills.map((s) => s.toLowerCase()));
  const priorityMap = new Map<string, number>();
  for (const ms of missingSkills) {
    priorityMap.set(ms.name.toLowerCase(), PRIORITY_WEIGHT[ms.priority] ?? 2);
  }

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const skill of requiredSkills) {
    const lower = skill.toLowerCase();
    const weight = priorityMap.get(lower) ?? PRIORITY_WEIGHT['High'];
    totalWeight += weight;
    if (matchedSet.has(lower)) matchedWeight += weight;
  }

  if (totalWeight === 0) return 50;
  const raw = Math.round((matchedWeight / totalWeight) * 100);
  return Math.max(10, Math.min(98, raw));
}

function buildSummary(
  matchedCount: number,
  total: number,
  highCount: number,
  mediumCount: number,
  targetRole: string
): string {
  const matchText = matchedCount === 1
    ? `You match 1 out of ${total} core skill`
    : `You match ${matchedCount} out of ${total} core skills`;

  if (highCount === 0 && mediumCount === 0) {
    return `${matchText} for ${targetRole} — you're well-prepared! Keep refining your portfolio to stand out.`;
  }
  if (highCount === 0) {
    const medText = mediumCount === 1 ? '1 Medium skill' : `${mediumCount} Medium skills`;
    return `${matchText} for ${targetRole}. No high-priority gaps left — focus on the ${medText} next to sharpen your profile.`;
  }
  const highText = highCount === 1 ? '1 High-priority skill' : `${highCount} High-priority skills`;
  return `${matchText} for ${targetRole}. Start with the ${highText} — these are dealbreakers in fresher interviews. Medium skills will further strengthen your profile.`;
}

function generateFallbackSkillGap(
  targetRole: string,
  userSkills: string[],
  seedRole?: (typeof SEED_ROLES)[0]
): GapDetectorOutput {
  const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim()).filter(Boolean);
  const benchmarkReq = seedRole
    ? seedRole.requiredSkills
    : ['Core Problem Solving', 'Git / GitHub', 'System Design Basics', 'Unit Testing', 'Communication Skills'];
  const benchmarkGood = seedRole
    ? seedRole.goodToHaveSkills
    : ['Cloud Deployment Basics', 'Clean Code Principles', 'CI/CD Fundamentals'];

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
        reason: getSkillReason(skill, isCore, targetRole),
        category: isCore ? 'Core Technical' : 'Tool / Framework',
      });
    }
  }

  const highCount = missingSkills.filter((m) => m.priority === 'High').length;
  const medCount = missingSkills.filter((m) => m.priority === 'Medium').length;
  const missingWithPriority = missingSkills.map((m) => ({ ...m }));
  const readinessScore = computeWeightedScore(matchedSkills, missingWithPriority, allReq);

  return {
    targetRole,
    readinessScore,
    requiredSkills: allReq,
    matchedSkills,
    missingSkills,
    summary: buildSummary(matchedSkills.length, allReq.length, highCount, medCount, targetRole),
    source: 'fallback',
  };
}
