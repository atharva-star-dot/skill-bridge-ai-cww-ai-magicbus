import type { ResumeReviewOutput, SectionChecks, BulletRewriteItem, MissingKeywordItem } from '@/lib/schemas/resume-checker.schema';
import { SEED_ROLES } from '@/data/seed-roles';

const ACTION_VERBS = [
  'built', 'developed', 'created', 'designed', 'implemented', 'engineered', 'architected',
  'optimized', 'refactored', 'integrated', 'deployed', 'automated', 'collaborated', 'analyzed',
  'managed', 'conducted', 'led', 'configured', 'tested', 'resolved'
];

export function generateFallbackResumeReview(
  targetRole: string,
  resumeText: string,
  benchmarkSkills?: string[]
): ResumeReviewOutput {
  const lowerText = resumeText.toLowerCase();

  // 1. Detect standard sections
  const sectionChecks: SectionChecks = {
    contact: /email|phone|github|linkedin|\b\d{10}\b|@/i.test(resumeText),
    summary: /summary|objective|about me|profile/i.test(resumeText),
    skills: /skills|technologies|technical proficiencies|tools/i.test(resumeText),
    experience: /experience|work history|employment|internship/i.test(resumeText),
    projects: /projects|personal projects|academic projects/i.test(resumeText),
    education: /education|b\.tech|b\.e|bca|mca|degree|university|college|gpa|cgpa/i.test(resumeText),
  };

  const sectionsDetectedCount = Object.values(sectionChecks).filter(Boolean).length;

  // 2. Extract benchmark skills
  const seedRole = SEED_ROLES.find(
    (r) => r.title.toLowerCase() === targetRole.toLowerCase() || r.slug === targetRole.toLowerCase()
  );
  const required = benchmarkSkills && benchmarkSkills.length > 0
    ? benchmarkSkills
    : seedRole
    ? [...seedRole.requiredSkills, ...seedRole.goodToHaveSkills]
    : ['Problem Solving', 'Data Structures', 'Git', 'Databases', 'Clean Code'];

  // 3. Keyword matching
  const matchedKeywords: string[] = [];
  const missingKeywords: MissingKeywordItem[] = [];

  for (const skill of required) {
    if (lowerText.includes(skill.toLowerCase())) {
      matchedKeywords.push(skill);
    } else {
      const isCore = seedRole?.requiredSkills.includes(skill) ?? true;
      missingKeywords.push({
        keyword: skill,
        priority: isCore ? 'High' : 'Medium',
        whereToAdd: `Include under Skills and mention how you applied it in Projects.`,
      });
    }
  }

  // 4. Metric & Action Verb density check
  const hasNumbersOrMetrics = /\b\d+([%kKmM\+]|\s*(users|seconds|ms|queries|requests|records|increase|decrease|growth))\b|\b\d{1,3}%\b/.test(resumeText);
  const actionVerbMatches = ACTION_VERBS.filter((v) => lowerText.includes(v));

  // 5. Compute deterministic score
  // Section completeness: 20 pts (max 6 sections)
  const sectionScore = Math.round((sectionsDetectedCount / 6) * 25);
  // Keyword relevance: 45 pts
  const keywordRatio = required.length > 0 ? (matchedKeywords.length / required.length) : 0.5;
  const keywordScore = Math.round(keywordRatio * 45);
  // Action verbs & metrics: 25 pts
  const verbScore = Math.min(15, actionVerbMatches.length * 3);
  const metricScore = hasNumbersOrMetrics ? 15 : 5;

  const rawScore = sectionScore + keywordScore + verbScore + metricScore;
  const atsScore = Math.max(25, Math.min(92, rawScore));

  // 6. Strengths & Weaknesses tailored to findings
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (matchedKeywords.length >= 3) {
    strengths.push(`Contains verified keywords aligned with ${targetRole} (${matchedKeywords.slice(0, 3).join(', ')}).`);
  } else {
    weaknesses.push(`Low density of keywords essential for ${targetRole} screening.`);
  }

  if (sectionChecks.projects) {
    strengths.push(`Includes dedicated project entries, allowing hiring managers to evaluate hands-on aptitude.`);
  } else {
    weaknesses.push(`Missing a dedicated Projects section demonstrating practical code experience.`);
  }

  if (actionVerbMatches.length >= 3) {
    strengths.push(`Uses active action verbs (${actionVerbMatches.slice(0, 3).join(', ')}) to frame responsibilities.`);
  } else {
    weaknesses.push(`Passive wording observed throughout; lacks assertive engineering action verbs.`);
  }

  if (hasNumbersOrMetrics) {
    strengths.push(`Features quantifiable metrics demonstrating measurable impact.`);
  } else {
    weaknesses.push(`No quantifiable metrics (e.g., [X%] speedup, [N] users) found to validate performance.`);
  }

  if (!sectionChecks.summary) {
    weaknesses.push(`Lacks a concise professional summary targeting the ${targetRole} position.`);
  }

  // 7. Deterministic bullet rewrites from candidate's actual text
  // Extract sentences or clauses from resume
  const lines = resumeText
    .split(/\n|\. |\; /)
    .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
    .filter((l) => l.length >= 15 && l.length <= 150);

  const bulletRewrites: BulletRewriteItem[] = [];

  for (let i = 0; i < 5; i++) {
    const rawLine = lines[i] || (i === 0 ? resumeText.slice(0, 80) : `Worked on core application features.`);
    const cleanOriginal = rawLine.replace(/[\r\n]+/g, ' ').trim();

    let improved = cleanOriginal;
    let why = '';

    if (i === 0) {
      improved = `Engineered ${cleanOriginal.replace(/^(built|created|made|worked on)\s+/i, '')}, achieving [X%] faster execution through optimized logic.`;
      why = `Lead with strong past-tense verb 'Engineered' and insert a placeholder metric '[X%]' to quantify impact.`;
    } else if (i === 1) {
      improved = `Designed and deployed ${cleanOriginal.replace(/^(developed|worked on|did)\s+/i, '')}, serving [N+] users with zero downtime.`;
      why = `Highlights architectural initiative and replaces passive wording with quantifiable scale '[N+]'.`;
    } else if (i === 2) {
      improved = `Refactored ${cleanOriginal.replace(/^(updated|fixed|worked on)\s+/i, '')}, improving codebase maintainability and test coverage by [X%].`;
      why = `Demonstrates professional code hygiene and quantifiable quality gains.`;
    } else if (i === 3) {
      improved = `Integrated RESTful endpoints for ${cleanOriginal.replace(/^(connected|handled)\s+/i, '')}, reducing latency by [X%].`;
      why = `Emphasizes production API integration standards with measurable performance improvements.`;
    } else {
      improved = `Implemented automated validation and modular components for ${cleanOriginal}, ensuring robust edge-case handling.`;
      why = `Demonstrates attention to software reliability and clean architecture.`;
    }

    bulletRewrites.push({
      original: cleanOriginal,
      improved,
      why,
    });
  }

  return {
    atsScore,
    targetRole,
    summary: `Resume scored ${atsScore}/100 for ${targetRole}. It matches ${matchedKeywords.length} key competencies with ${sectionsDetectedCount}/6 standard resume sections detected.`,
    strengths,
    weaknesses,
    missingKeywords,
    bulletRewrites,
    sectionChecks,
    source: 'fallback',
  };
}
