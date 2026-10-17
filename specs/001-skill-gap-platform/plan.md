# Implementation Plan: Skill Bridge AI Platform

**Branch**: `001-skill-gap-platform` | **Date**: 2026-10-17 | **Spec**: [specs/001-skill-gap-platform/spec.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/spec.md)

**Input**: Feature specification from `/specs/001-skill-gap-platform/spec.md` with implementation parameters:
- **Stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zod.
- **AI**: Gemini API strictly server-side with JSON-mode structured output and retry handling.
- **Storage**: Prisma ORM with SQLite (local zero-config) + Supabase PostgreSQL compatibility; guest session persistence in browser (`localStorage`) and database.
- **Deployment**: Vercel deployment with live working URL.
- **Architecture**: Minimal, decoupled, implementable in one focused build session.

---

## 1. Summary

Skill Bridge AI is a web application helping college students and early-career job seekers identify missing skills for target roles and close those gaps through actionable, structured pathways. The platform features:
1. **Skill Gap Detector (Hero)**: Computes a 0–100 readiness score and categorizes missing skills (High/Medium/Low priority).
2. **Personal Learning Plan**: Generates a 2/4/8-week milestone curriculum with interactive task checkboxes updating readiness.
3. **Resume Checker**: Delivers ATS compatibility scores, strengths/weaknesses, missing keywords, and exactly 5 rewritten bullets.
4. **AI Interviews**: 5 sequential technical and behavioral questions scored 1–10 with constructive feedback and sample answers.
5. **Job Matches**: Instant percentage matching against 30–50 curated entry-level jobs in India from a seed catalog.

---

## 2. Technical Context & Constraints

- **Language / Runtime**: TypeScript 5+ on Node.js 18+.
- **Frontend**: Next.js 14/15 App Router, React 18/19, Tailwind CSS, Lucide React, shadcn/ui (Radix primitives), `canvas-confetti`.
- **Backend**: Next.js App Router Route Handlers (`/app/api/...`), server-side only.
- **AI Engine**: Google Gemini API (`@google/genai` or `@google/generative-ai`), model `gemini-1.5-flash` or `gemini-2.5-flash` with `responseMimeType: "application/json"`.
- **ORM & Database**: Prisma ORM with SQLite (`prisma/dev.db`) for immediate local development; seamlessly pointable to Supabase Postgres via `DATABASE_URL` for Vercel deployment.
- **Validation**: Strict Zod schemas validating 100% of AI responses before dispatching to client components.
- **Platform Compatibility**: All commands and scripts compatible with Windows PowerShell.

---

## 3. Concrete Folder Structure

```text
skill-bridge-ai/
├── prisma/
│   ├── schema.prisma           # Prisma schema with 9 models
│   └── dev.db                  # Local SQLite database
├── public/                     # Static assets, favicon, logo
├── scripts/
│   └── seed.ts                 # Seed script for 25 target roles and 40 curated jobs
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout: Navbar, Toast provider, Footer
│   │   ├── page.tsx            # High-conversion Landing page
│   │   ├── onboarding/
│   │   │   └── page.tsx        # Fast role & skill onboarding (guest mode)
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Central Hub: readiness gauge, progress, 5 feature cards
│   │   ├── gap-detector/
│   │   │   └── page.tsx        # Hero feature: visual score, match vs missing badges
│   │   ├── learning-plan/
│   │   │   └── page.tsx        # Interactive week-by-week roadmap with task checkboxes
│   │   ├── resume-checker/
│   │   │   └── page.tsx        # ATS score, missing keywords, 5 bullet rewrites
│   │   ├── interviews/
│   │   │   └── page.tsx        # 5-question mock interview flow with live coaching
│   │   ├── job-matches/
│   │   │   └── page.tsx        # Curated entry-level roles ranked by match %
│   │   └── api/
│   │       ├── gap-detector/
│   │       │   └── route.ts    # POST: AI skill gap analysis
│   │       ├── learning-plan/
│   │       │   └── route.ts    # POST: AI week-by-week plan generation
│   │       ├── resume-checker/
│   │       │   └── route.ts    # POST: AI ATS review & 5 bullet rewrites
│   │       ├── interview/
│   │       │   └── route.ts    # POST: AI interview question evaluation & scoring
│   │       ├── jobs/
│   │       │   └── route.ts    # GET: Ranked jobs matching user skills
│   │       └── session/
│   │           └── route.ts    # GET / POST: Guest session sync between browser & DB
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (Button, Card, Badge, Progress, Dialog, Tabs)
│   │   ├── shared/             # Navbar, Footer, ReadinessGauge, SkillTagInput, LoadingState, ErrorAlert
│   │   └── features/           # Feature-specific client components
│   │       ├── GapReportView.tsx
│   │       ├── LearningRoadmapView.tsx
│   │       ├── ResumeReviewView.tsx
│   │       ├── InterviewSessionView.tsx
│   │       └── JobMatchesView.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gemini.ts       # Server-side Gemini client with exponential backoff retry
│   │   │   └── prompts.ts      # Prompt templates for Gap, Plan, Resume, Interview
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── schemas/            # Zod validation schemas
│   │   │   ├── gap-detector.schema.ts
│   │   │   ├── learning-plan.schema.ts
│   │   │   ├── resume-checker.schema.ts
│   │   │   ├── interview.schema.ts
│   │   │   └── session.schema.ts
│   │   ├── storage/            # Browser localStorage sync helpers
│   │   └── utils.ts            # Tailwind cn() and formatting utilities
│   └── data/
│       ├── seed-roles.ts       # TypeScript export of 25 seed target roles
│       └── seed-jobs.ts        # TypeScript export of 40 curated jobs
├── specs/                      # Specification and planning artifacts
├── .env.example                # Sample environment variables
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 4. Exact Data Models (Prisma)

As defined in [data-model.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/data-model.md):

1. **`Session`**: Tracks guest learner session (`id`, `targetRoleId`, `targetRoleTitle`, `currentSkills`, `readinessScore`, timestamps).
2. **`TargetRole`**: Seed roles with core benchmark skills (`id`, `slug`, `title`, `category`, `requiredSkills`, `goodToHaveSkills`).
3. **`SkillGapReport`**: Result of gap analysis (`id`, `sessionId`, `targetRole`, `readinessScore`, `matchedSkills`, `missingSkills`, `summary`).
4. **`LearningPlan`**: Personalized roadmap (`id`, `sessionId`, `targetRole`, `durationWeeks`, `completionPercentage`).
5. **`PlanTask`**: Granular weekly task (`id`, `planId`, `weekNumber`, `title`, `description`, `estimatedHours`, `isCompleted`, `resources`).
6. **`ResumeReview`**: Resume diagnostics (`id`, `sessionId`, `targetRole`, `atsScore`, `strengths`, `weaknesses`, `missingKeywords`, `bulletRewrites`).
7. **`InterviewSession`**: Mock interview instance (`id`, `sessionId`, `targetRole`, `status`, `currentQuestionIndex`, `summary`).
8. **`InterviewAnswer`**: Per-question transcript (`id`, `interviewSessionId`, `questionIndex`, `questionType`, `questionText`, `userAnswer`, `score`, `feedback`, `sampleAnswer`).
9. **`JobRole`**: Curated job listings (`id`, `title`, `company`, `location`, `experienceLevel`, `salaryRange`, `skills`, `applyUrl`).

---

## 5. API Routes per Feature

| Route | Method | Purpose | Input | Output Schema |
|---|:---:|---|---|---|
| `/api/gap-detector` | POST | Analyze skills/resume vs role | `{ sessionId, targetRole, currentSkills, resumeText? }` | `SkillGapReportOutputSchema` |
| `/api/learning-plan` | POST | Generate week-by-week roadmap | `{ sessionId, targetRole, missingSkills, durationWeeks }` | `LearningPlanOutputSchema` |
| `/api/resume-checker` | POST | ATS score, keywords & 5 rewrites | `{ sessionId, targetRole, resumeText }` | `ResumeReviewOutputSchema` |
| `/api/interview` | POST | Mock interview question & feedback | `{ action: 'start' \| 'evaluate', ... }` | `EvaluateInterviewResponseSchema` |
| `/api/jobs` | GET | Ranked matching jobs from seed | `?skills=React,Node&role=Frontend` | `JobsResponseSchema` |
| `/api/session` | GET/POST | Fetch or sync guest session | `{ sessionId, targetRole?, currentSkills?, ... }` | `SessionResponseSchema` |

---

## 6. Prompt Templates & Zod Schemas

All prompt builders and Zod validation contracts are documented in:
[ai-schemas-prompts.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/contracts/ai-schemas-prompts.md).

- **Structured Output Strategy**: Every Gemini call uses `responseMimeType: "application/json"` with schema descriptions embedded in the prompt.
- **Markdown Stripping**: If Gemini returns code fence wrappers (` ```json ... ``` `), a utility pre-strips fences before executing `Schema.parse()`.

---

## 7. AI Error Handling with Retry

To prevent transient network glitches, quota spikes (HTTP 429), or malformed JSON from disrupting the demo, all Gemini requests pass through `executeGeminiWithRetry`:

```typescript
// src/lib/ai/gemini.ts
import { GoogleGenAI } from '@google/genai';
import { z, ZodSchema } from 'zod';

export async function executeGeminiWithRetry<T>(
  prompt: string,
  schema: ZodSchema<T>,
  maxRetries: number = 3
): Promise<T> {
  const delays = [500, 1200, 2500];
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in environment variables');

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2, // Low temperature for high structural fidelity
        },
      });

      const rawText = response.text || '';
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsedData = JSON.parse(cleanJson);
      return schema.parse(parsedData);
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err?.status === 429 || err?.message?.includes('429');
      const isTransient = err?.status >= 500 || err?.message?.includes('fetch failed');

      if ((isRateLimit || isTransient) && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        continue;
      }
      break;
    }
  }

  throw new Error(`AI generation failed after ${maxRetries} attempts: ${(lastError as Error)?.message}`);
}
```

---

## 8. Seed Script for Roles & Jobs (`scripts/seed.ts`)

A standalone TypeScript script executable with Windows PowerShell (`npm run seed`):
- **25 Target Roles**:
  - Frontend: Junior Frontend Developer, React Developer, Next.js Engineer, UI Engineer.
  - Backend: Junior Backend Developer, Node.js Engineer, Python/FastAPI Developer, Java Spring Boot Fresher.
  - Full Stack: Full Stack MERN Developer, Next.js Full Stack Engineer.
  - Data & AI: Data Analyst Intern, Junior Data Scientist, AI/ML Intern, Business Intelligence Analyst.
  - DevOps & Cloud: Cloud Support Associate, Junior DevOps Engineer.
  - Quality & Mobile: QA Automation Engineer, Flutter Developer, React Native Intern, Cybersecurity Trainee, etc.
- **40 Curated Jobs**:
  - Realistically distributed across India tech hubs (Bengaluru, Hyderabad, Pune, Gurgaon, Noida, Chennai, Remote).
  - Accurate fresher compensation ranges (e.g. ₹3.5–₹8 LPA or ₹20k–₹40k/month stipend).
  - Explicit skill tags for high-precision client/server matching.

---

## 9. Constitution Check & Gate Validation

- **Principle I (Boring Tech / Fast MVP)**: Clean Next.js monolith with Prisma SQLite + Supabase readiness. **PASS**.
- **Principle II (Server-Side AI with Zod)**: Gemini called only in API routes; 100% outputs validated via Zod. **PASS**.
- **Principle III (Fault Isolation)**: Independent API routes and UI error boundaries guarantee isolated feature execution. **PASS**.
- **Principle IV (Mobile-First UX)**: Tailwind responsive styling, explicit loading spinners, and error alerts. **PASS**.
- **Principle V (Rapid Manual Verification)**: Verified in < 60 seconds per quickstart scenario. **PASS**.
- **Principle VI (Windows PowerShell)**: Zero bash-only scripts; tested in PowerShell. **PASS**.

---

## 10. Verification & Quickstart Runbook

See [quickstart.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/quickstart.md) for 5 verification flows testable manually in under 60 seconds each.
