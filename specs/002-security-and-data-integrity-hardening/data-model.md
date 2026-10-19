# Data Model Changes: Security and Data Integrity Hardening

**Feature**: `002-security-and-data-integrity-hardening`
**Date**: 2026-10-20
**Schema source of truth**: `supabase/*.sql`
**Runtime ORM mirror**: `prisma/schema.prisma`

This document specifies deltas to the current database model. It does not edit the feature 001 data-model or API contract files. After `supabase/04_hardening.sql` is applied, Prisma declarations must match the resulting SQL schema in names, types, defaults, references, delete actions, indexes, and uniqueness.

## Existing Entity Changes

### Profile

- Remains keyed by the corresponding Supabase Auth UUID.
- Backfill missing profile rows from `auth.users`; use `ON CONFLICT (id) DO NOTHING` so pre-existing profile attributes are never overwritten.
- User-owned root records reference `public.profiles(id) ON DELETE CASCADE`.
- Preserve profile columns and mapped names already declared in SQL and Prisma.

### SkillGapReport, LearningPlan, ResumeReview, InterviewSession

- Change each `user_id` foreign key from `auth.users(id)` to `profiles(id)`, with cascade on profile deletion.
- Preserve all existing columns, indexes, SQL table names, Prisma model names, and column mappings.
- Keep `learning_plans -> plan_tasks` cascade.

### InterviewAnswer

- Preserve `interview_answers -> interview_sessions` cascade.
- Add a unique constraint on `(interview_session_id, question_index)` so only one answer can exist per interview question.
- Keep the existing lookup index only if needed by the deployed query plan; if the unique index serves the same prefix lookup, avoid a redundant index after verifying existing SQL and Prisma index intent.
- Completion remains an application invariant: an interview is complete only after exactly five ordered answer rows each have a non-null score.

## New Entity: AI Usage

Add `public.ai_usage` as a per-invocation rolling quota ledger:

| SQL column | Type | Rules | Prisma field |
|---|---|---|---|
| `id` | `uuid` | Primary key, generated UUID | `id String @id @default(uuid()) @db.Uuid` |
| `user_id` | `uuid` | Required, references `profiles(id) ON DELETE CASCADE` | `userId String @map("user_id") @db.Uuid` |
| `created_at` | `timestamptz` | Required, database timestamp default | `createdAt DateTime @default(now()) @map("created_at")` |

Add an index on `(user_id, created_at)` to count the authenticated user's invocations in the preceding 60 minutes and locate the oldest timestamp for `Retry-After`. Each row represents one admitted AI workflow; retries and fallback do not create additional rows. Expired rows may be deleted during an atomic reservation. Never accept a user ID from the request body for attribution; derive it from the authenticated user.

Add the Prisma `AiUsage` model mapped to `ai_usage` and the inverse `Profile.aiUsage` relation. Keep the SQL and Prisma UUID/timestamp defaults and `(user_id, created_at)` index equivalent.

## Constraints and Invariants

- Foreign key repair and profile backfill are repeatable and fail visibly on unexpected SQL errors.
- New/changed table declarations in `04_hardening.sql` and Prisma use the same physical table and column names.
- Migration SQL adds `IF NOT EXISTS`/catalog guards where rerun safety requires them; it must validate existing data before enforcing new unique/FK constraints.
- The SQL-defined unique answer key is represented by Prisma `@@unique([interviewSessionId, questionIndex])`.
- Prisma's runtime DB role may be more privileged than the end-user. API queries still constrain every user-owned read/write by the authenticated Supabase user ID; do not treat RLS as a replacement for route-level ownership checks.
- A profile deletion cascades all rows in reports, plans/tasks, resumes, interviews/answers. Auth-user deletion follows separately through the Supabase Admin API.
- SQL RLS remains enabled for authenticated Supabase access. Privileged Prisma access must not be presented as end-user RLS enforcement.

## Migration Order

1. Inspect existing constraints and identify application rows whose `user_id` does not have an Auth user/profile.
2. Backfill missing `profiles` from `auth.users` without replacing existing rows.
3. Repair/replace root-table user foreign keys to reference `public.profiles`.
4. Add `ai_usage` and its rolling-window index.
5. Add interview-answer unique constraint after detecting/reporting duplicate legacy answers; do not silently delete or merge user answers.
6. Keep SQL files idempotent and append `04_hardening.sql` after existing schema, security, and seed SQL in `00_RUN_ALL.sql`.
7. Mirror SQL changes in `prisma/schema.prisma`; validate `prisma validate` and inspect SQL catalog state before/after rerun.

If duplicate interview answers or orphaned user rows block a constraint, the migration must stop with an actionable error; data must not be silently discarded to force migration success.
