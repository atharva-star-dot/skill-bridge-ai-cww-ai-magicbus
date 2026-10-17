# Research & Technical Decisions: Skill Bridge AI Platform

**Feature**: [Skill Bridge AI Platform](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/spec.md)
**Date**: 2026-10-17
**Status**: Resolved

---

## 1. Storage & ORM Architecture (Prisma + SQLite / Supabase)

- **Decision**: Prisma ORM with SQLite for instant local zero-config development (`file:./dev.db`), with dual-mode support for Supabase PostgreSQL on Vercel deployment. In addition, browser `localStorage` acts as an immediate client-side cache for guest sessions.
- **Rationale**:
  - Prisma provides type-safe client generation, migrations, and a clean schema definition matching the exact data models (`Session`, `TargetRole`, `SkillGapReport`, `LearningPlan`, `PlanTask`, `ResumeReview`, `InterviewSession`, `InterviewAnswer`, `JobRole`).
  - SQLite requires zero external cloud accounts to run locally out-of-the-box (`npx prisma db push`).
  - Switching to Supabase PostgreSQL for Vercel production deployment requires changing only `DATABASE_URL` and provider in `schema.prisma`.
- **Alternatives Considered**:
  - *Raw SQL*: Rejected due to manual migration maintenance and lack of autocompletion.
  - *Cloud-only Supabase without local SQLite*: Rejected because local development would require an active internet connection and Supabase provisioning before running tests.

---

## 2. Gemini API Integration & Resilient Error Handling

- **Decision**: Official `@google/genai` (or `@google/generative-ai`) SDK on server-side route handlers with:
  1. **Strict JSON Mode**: `generationConfig: { responseMimeType: "application/json" }`.
  2. **Retry Mechanism**: Exponential backoff with jitter (up to 3 retries: 500ms, 1200ms, 2500ms) for transient HTTP 429 (quota), 500, or 503 errors.
  3. **Zod Validation & Sanitization**: All Gemini outputs are parsed via `Schema.safeParse()`. If raw output contains Markdown code fence artifacts (e.g. ` ```json ... ``` `), a pre-sanitizer strips fences before parsing.
  4. **Graceful Fallback**: If all retries fail, return a structured fallback response with an informative error state, keeping the client UI intact.
- **Rationale**:
  - Adheres strictly to Constitution Principle II (Server-Side Structured AI with Zod Validation) and Principle III (Fault Isolation).
- **Alternatives Considered**:
  - *Single-shot call without retry*: Prone to intermittent network hiccups or quota spikes.
  - *Client-side AI calling*: Forbidden by Constitution Principle II.

---

## 3. Session & Guest Identification

- **Decision**:
  - Client generates a UUIDv4 on initial visit and persists it in `localStorage` under `skill_bridge_session_id`.
  - Every API request sends `x-session-id` header or body `sessionId`.
  - The server upserts the `Session` record in the database.
  - State (target role, readiness score) is synced bidirectionally.
- **Rationale**:
  - Eliminates signup barriers for college students.
  - Guarantees immediate access to the hero gap detector in under 2 minutes.

---

## 4. Prompt Templates & Structured Outputs

- **Decision**: Modular prompt builders located in `src/lib/ai/prompts/`:
  - `skill-gap.prompt.ts`: Ingests target role + user skills/resume text; returns `SkillGapReportSchema`.
  - `learning-plan.prompt.ts`: Ingests missing skills + target duration (2/4/8 weeks); returns `LearningPlanSchema`.
  - `resume-review.prompt.ts`: Ingests resume text + target role; returns `ResumeReviewSchema` with exactly 5 rewrites.
  - `interview.prompt.ts`: Ingests role + current question + user answer; returns `InterviewFeedbackSchema` with score 1-10 and sample answer.

---

## 5. Seed Strategy for Roles and Jobs

- **Decision**: Executable TypeScript script `scripts/seed.ts` (invoked via `npm run seed` in PowerShell):
  - Populates 25 high-demand entry-level roles in India with predefined skill benchmarks.
  - Populates 40 realistic entry-level job listings with company names, locations (Bengaluru, Hyderabad, Pune, Gurgaon, Remote), salary/stipend ranges, and skill requirements.
  - Idempotent execution (upsert based on unique slug/ID).
