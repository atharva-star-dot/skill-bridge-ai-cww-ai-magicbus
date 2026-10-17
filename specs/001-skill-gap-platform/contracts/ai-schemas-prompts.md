# AI Prompt Templates & Zod Schemas

**Feature**: [Skill Bridge AI Platform](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/spec.md)
**Date**: 2026-10-17

---

## 1. Skill Gap Detector

### Zod Schema
```typescript
import { z } from 'zod';

export const MissingSkillSchema = z.object({
  name: z.string().describe('Name of the missing skill or competency'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('Impact level on hiring for fresher/early career'),
  reason: z.string().describe('Clear, actionable explanation of why this skill is needed'),
  category: z.enum(['Core Technical', 'Tool / Framework', 'Soft Skill / Workflow']).describe('Skill category'),
});

export const SkillGapReportOutputSchema = z.object({
  targetRole: z.string().describe('The evaluated target job role title'),
  readinessScore: z.number().int().min(0).max(100).describe('Calculated role readiness score out of 100'),
  requiredSkills: z.array(z.string()).describe('Complete benchmark list of expected skills for this role'),
  matchedSkills: z.array(z.string()).describe('Skills the user currently possesses matching the role requirements'),
  missingSkills: z.array(MissingSkillSchema).describe('Prioritized list of missing skills'),
  extractedSkillsFromResume: z.array(z.string()).optional().describe('Skills extracted if raw resume text was provided'),
  summary: z.string().describe('Encouraging 2-3 sentence diagnostic overview for the candidate'),
});

export type SkillGapReportOutput = z.infer<typeof SkillGapReportOutputSchema>;
```

### Prompt Template
```typescript
export function buildSkillGapPrompt(targetRole: string, currentSkills: string[], resumeText?: string): string {
  return `
You are an expert technical recruiter and career coach specializing in entry-level and fresher hiring in India.
Analyze the candidate's current capabilities against the industry benchmarks for the target role: "${targetRole}".

Candidate Current Skills: ${currentSkills.length > 0 ? currentSkills.join(', ') : 'None explicitly specified'}
${resumeText ? `Candidate Resume Text:\n"""\n${resumeText}\n"""` : ''}

Instructions:
1. Benchmark the key skills required for a fresher/junior "${targetRole}" in modern tech companies.
2. Identify which of these required skills the candidate already possesses (matchedSkills).
3. Identify the missing skills. Rank each as "High" (absolute dealbreaker for hiring), "Medium" (important differentiator), or "Low" (good to have / can learn on the job).
4. Provide a clear 1-sentence reason for each missing skill.
5. Compute a realistic readiness score out of 100 based on the matched vs missing skill weight.
6. Provide an encouraging 2-sentence summary.

You MUST respond strictly with valid JSON conforming to the requested schema. No markdown formatting, no conversational filler.
`;
}
```

---

## 2. Personal Learning Plan

### Zod Schema
```typescript
import { z } from 'zod';

export const PlanTaskSchema = z.object({
  id: z.string().describe('Unique task ID, e.g., w1-t1'),
  title: z.string().describe('Clear, actionable practice task title'),
  description: z.string().describe('Specific instructions on what to build or practice'),
  estimatedHours: z.number().positive().describe('Estimated hours required to complete'),
  isCompleted: z.boolean().default(false),
});

export const LearningResourceSchema = z.object({
  title: z.string().describe('Resource title (e.g. MDN Web Docs, freeCodeCamp)'),
  url: z.string().url().describe('Direct URL to reputable, free learning resource'),
  type: z.enum(['Article', 'Video', 'Docs', 'Course']),
  isFree: z.boolean().default(true),
});

export const MiniProjectSchema = z.object({
  title: z.string().describe('Title of the milestone portfolio project'),
  description: z.string().describe('Scope and problem statement for the project'),
  deliverables: z.array(z.string()).describe('Concrete deliverables to showcase on GitHub'),
});

export const PlanWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(8),
  theme: z.string().describe('Weekly focus theme (e.g., "Deep Dive into TypeScript & State")'),
  topics: z.array(z.string()).describe('Core theoretical and practical topics'),
  tasks: z.array(PlanTaskSchema).min(2).max(4).describe('2 to 4 hands-on practice tasks for this week'),
  resources: z.array(LearningResourceSchema).min(1).max(3).describe('1 to 3 free resources'),
  miniProject: MiniProjectSchema.describe('Weekly mini milestone project'),
});

export const LearningPlanOutputSchema = z.object({
  targetRole: z.string(),
  durationWeeks: z.union([z.literal(2), z.literal(4), z.literal(8)]),
  weeks: z.array(PlanWeekSchema),
  summary: z.string().describe('Roadmap overview and motivational guidance'),
});

export type LearningPlanOutput = z.infer<typeof LearningPlanOutputSchema>;
```

### Prompt Template
```typescript
export function buildLearningPlanPrompt(targetRole: string, missingSkills: string[], durationWeeks: number): string {
  return `
You are a senior curriculum engineer creating a personalized ${durationWeeks}-week learning roadmap for a fresher targeting the role: "${targetRole}".
The candidate needs to close the following specific skill gaps: ${missingSkills.join(', ')}.

Instructions:
1. Create a structured week-by-week curriculum for exactly ${durationWeeks} weeks (Week 1 to Week ${durationWeeks}).
2. For each week:
   - Define a clear theme and 3-5 specific topics.
   - Create 2-3 hands-on practical tasks with realistic estimated completion hours (2-5 hours each).
   - Link 1-3 reputable, 100% FREE learning resources (prefer MDN, freeCodeCamp, official documentation, reputable YouTube channels).
   - Define 1 tangible mini-project deliverable suitable for a student's GitHub portfolio.
3. Order the weeks logically: start with foundations and core mechanics before moving to advanced integration and project deployment.

You MUST respond strictly with valid JSON conforming to the requested schema.
`;
}
```

---

## 3. Resume Review & ATS Optimizer

### Zod Schema
```typescript
import { z } from 'zod';

export const BulletRewriteSchema = z.object({
  original: z.string().describe('Original resume bullet or weakness identified'),
  improved: z.string().describe('High-impact rewritten bullet with action verb and metrics'),
  rationale: z.string().describe('Why this rewrite performs better for ATS and hiring managers'),
});

export const ResumeReviewOutputSchema = z.object({
  targetRole: z.string(),
  atsScore: z.number().int().min(0).max(100).describe('Estimated ATS keyword and formatting match score'),
  strengths: z.array(z.string()).min(2).max(5).describe('Identified strengths in candidate background'),
  weaknesses: z.array(z.string()).min(2).max(5).describe('Areas needing improvement or lacking specificity'),
  missingKeywords: z.array(z.string()).min(3).max(10).describe('High-frequency ATS keywords absent from the resume'),
  bulletRewrites: z.array(BulletRewriteSchema).length(5).describe('Exactly 5 concrete bullet point improvements'),
  summary: z.string().describe('Constructive 2-3 sentence critique'),
});

export type ResumeReviewOutput = z.infer<typeof ResumeReviewOutputSchema>;
```

### Prompt Template
```typescript
export function buildResumeReviewPrompt(targetRole: string, resumeText: string): string {
  return `
You are a certified professional resume writer and former technical hiring manager in India reviewing an entry-level candidate's resume for the role: "${targetRole}".

Candidate Resume Text:
"""
${resumeText}
"""

Instructions:
1. Calculate a realistic ATS compatibility score out of 100 based on standard industry screening filters for "${targetRole}".
2. Identify 2-4 genuine strengths in the resume.
3. Identify 2-4 critical weaknesses (e.g., passive voice, missing numbers, generic responsibilities).
4. List the top 5-8 missing high-value ATS keywords that recruiters search for.
5. Provide EXACTLY 5 bullet point rewrites:
   - Select 5 weak, generic, or poorly formatted statements from the resume.
   - Rewrite each using the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
   - Tailor the rewrite for a fresher candidate (realistic metrics, active verbs like "Architected", "Engineered", "Optimized", "Refactored").
   - Give a succinct 1-sentence explanation of why the rewrite is superior.

You MUST respond strictly with valid JSON conforming to the requested schema.
`;
}
```

---

## 4. AI Mock Interview Practice & Feedback

### Zod Schema
```typescript
import { z } from 'zod';

export const InterviewFeedbackOutputSchema = z.object({
  score: z.number().int().min(1).max(10).describe('Numerical score from 1 (poor) to 10 (exceptional)'),
  feedback: z.string().describe('Specific, constructive critique of the candidate response'),
  sampleAnswer: z.string().describe('A model answer that demonstrates what a top candidate would say'),
  keyTakeaway: z.string().describe('One memorable tip for future questions'),
});

export const InterviewSummaryOutputSchema = z.object({
  overallRating: z.number().min(1).max(10).describe('Overall average performance rating'),
  strengths: z.array(z.string()).min(2).describe('Key interview strengths demonstrated'),
  criticalImprovements: z.array(z.string()).min(2).describe('Areas to refine before real interviews'),
  readinessVerdict: z.string().describe('Encouraging concluding advice for the candidate'),
});
```

### Prompt Template (Per-Question Evaluation)
```typescript
export function buildInterviewEvaluationPrompt(
  targetRole: string,
  questionIndex: number,
  questionText: string,
  userAnswer: string
): string {
  return `
You are a supportive, insightful senior technical interviewer conducting a mock interview for the role "${targetRole}".
Question ${questionIndex + 1} of 5:
"${questionText}"

Candidate's Answer:
"${userAnswer}"

Instructions:
1. Score the answer from 1 to 10 based on clarity, technical accuracy, and structure.
2. Provide constructive, encouraging feedback explaining what was good and what was missing.
3. Provide an exemplary "Sample Answer" tailored for an entry-level interview that is concise, articulate, and demonstrates deep understanding.
4. Provide one key takeaway rule of thumb.

You MUST respond strictly with valid JSON conforming to the requested schema.
`;
}
```
