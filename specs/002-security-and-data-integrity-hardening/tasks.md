# Tasks: Security and Data Integrity Hardening

**Input**: Design documents from `/specs/002-security-and-data-integrity-hardening/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `contracts/route-deltas.md`

**Organization**: Workstreams US1–US11 below decompose the security, data-integrity, correctness, AI-reliability, and operational outcomes into independently verifiable stories. Workstreams are ordered by priority (P0 → P1 → P2), and each task identifies the exact files to change or add.

**Test-first rule**: For US1, US2, US5, US7, US8, US9, US10, and US11, write and run the listed failing tests before implementing that workstream.

## Phase 1: Test and Schema Foundations

**Purpose**: Establish focused test tooling before story tests are authored.

- [x] T001 Add Vitest and test scripts (`test`, `test:watch`) to `package.json` and update `package-lock.json`.
- [x] T002 [P] Add Vitest configuration in `vitest.config.ts` with TypeScript path alias support and test discovery for `src/**/*.test.ts`, `tests/**/*.test.ts`, and `scripts/**/*.test.ts`.
## P0 — Security and Data Integrity

## Phase 2: User Story 1 — Protect User Data and Requests (P0)

**Goal**: Prevent cross-user writes and open redirects, and ensure sensitive internal errors are not returned or logged.

**Independent Test**: As user B, PATCH user A's task and verify 404/no DB mutation; test unsafe redirect inputs at callback/login; induce failures and inspect response/log redaction.

### Tests for US1 — write and run before implementation

- [x] T003 [P] [US1] Add task ownership route tests covering owned, missing, and another user's task IDs with no-write assertions in `src/app/api/learning-plan/task/[taskId].test.ts`.
- [x] T004 [P] [US1] Add safe redirect unit tests for relative paths, `@evil.com`, protocol-relative URLs, absolute URLs, backslashes, whitespace/control characters, and encoded/multiply encoded variants in `src/lib/utils/redirect.test.ts`.
- [x] T005 [P] [US1] Add callback redirect tests for hostile and valid `next` parameters in `src/app/auth/callback/route.test.ts`.
- [x] T006 [P] [US1] Add login navigation tests for hostile and valid `next` parameters in `src/app/login/page.test.tsx`.
- [x] T007 [US1] Extend the error-response/log-redaction tests for gap-detector, resume-checker, learning-plan task, and interview answer failures in `src/app/api/gap-detector/route.test.ts`, `src/app/api/resume-checker/route.test.ts`, `src/app/api/learning-plan/task/[taskId].test.ts`, and `src/app/api/interview/answer/route.test.ts`.

### Implementation for US1

- [x] T008 [P] [US1] Add a shared same-origin relative path validator with canonical decoding and resolved-origin checks in `src/lib/utils/redirect.ts`.
- [x] T009 [US1] Change `src/app/api/learning-plan/task/[taskId]/route.ts` to verify the task's owning plan is for the authenticated user before any write; return 404 for missing/non-owned tasks and keep task/progress/profile writes transactionally consistent.
- [x] T010 [US1] Apply the shared destination validator in `src/app/auth/callback/route.ts`; retain existing onboarding routing while falling back to `/dashboard` for unsafe `next` values.
- [x] T011 [US1] Apply the same shared destination validator before `router.push` in `src/app/login/page.tsx`; preserve the existing onboarding/dashboard role-aware fallback.
- [x] T012 [US1] Replace exposed internal error messages with generic client messages and add safe server diagnostics in `src/app/api/gap-detector/route.ts`, `src/app/api/resume-checker/route.ts`, `src/app/api/learning-plan/task/[taskId]/route.ts`, and `src/app/api/interview/answer/route.ts`; never log resume text or interview answers.

## Phase 3: User Story 2 — Validate Request Data (P0)

**Goal**: Reject oversized/invalid session and gap-detector request bodies before persistence.

**Independent Test**: Submit invalid session/gap inputs at and beyond each configured boundary; invalid requests are rejected before persistence.

### Tests for US2 — write and run before implementation

- [x] T013 [P] [US2] Add Zod boundary tests for role length, 50/51 skill count, 60/61 skill length, and readiness score bounds in `src/lib/schemas/session.schema.test.ts` and `src/lib/schemas/gap-detector.schema.test.ts`.

### Implementation for US2

- [x] T014 [P] [US2] Add shared Zod session update schema with `targetRole` 2–100 chars, `currentSkills` max 50 items/max 60 chars per item, and integer `readinessScore` 0–100 in `src/lib/schemas/session.schema.ts`.
- [x] T015 [US2] Enforce the shared maximum skill count/length rules in `src/lib/schemas/gap-detector.schema.ts` without changing other feature 001 request fields.
- [x] T016 [US2] Parse and validate `POST /api/session` before any persistence in `src/app/api/session/route.ts`; return the existing validation error contract and retain success response fields.

## Phase 4: User Story 3 — Cascade Profile Data and Delete Auth Account (P0)

**Goal**: Backfill missing profiles, cascade-delete related rows, and truthfully handle Auth deletion failures and retries.

**Independent Test**: On a disposable Supabase project, apply the migration twice, verify existing profile data is preserved, delete a test account with related records, and retry after simulated Auth-admin failure.

### Tests for US3

- [x] T017 [P] [US3] Add migration idempotency/backfill/constraint checks in `tests/database/hardening-migration.test.ts`; verify profile conflicts preserve rows and duplicate interview answers stop migration without data loss.
- [x] T018 [P] [US3] Add cascade, Auth-admin failure, and retry-after-profile-deletion tests in `src/app/api/my-data/route.test.ts`.

### Implementation for US3

- [x] T019 [US3] Add idempotent `supabase/04_hardening.sql`: backfill missing profiles from `auth.users` with conflict-safe inserts, validate legacy orphan/duplicate data before constraints, re-point user-owned root foreign keys to `public.profiles(id) ON DELETE CASCADE`, add interview-answer uniqueness, create/index `public.ai_usage`, and add narrowly scoped atomic quota/interview SQL functions with safe `search_path` and restricted execution grants.
- [x] T020 [US3] Append `supabase/04_hardening.sql` to `supabase/00_RUN_ALL.sql` after schema and auth/security setup; preserve seed ordering and ensure reruns surface errors.
- [x] T021 [US3] Mirror SQL tables, root/child foreign keys, indexes, defaults, `ai_usage`, and `@@unique([interviewSessionId, questionIndex])` in `prisma/schema.prisma`; keep `DATABASE_URL` and `DIRECT_URL` datasource settings.
- [x] T022 [US3] Change `src/app/api/my-data/route.ts` to delete the authenticated profile (allowing cascades) then delete that same Auth user through the server-only `SUPABASE_SERVICE_ROLE_KEY`; fail explicitly on either step, never report partial success, and permit retry if the profile is already absent.

## Phase 5: User Story 4 — Report Persistence and Resilient Export (P0)

**Goal**: Make unsaved gap reports visible, replace resume reviews atomically, and keep exports working despite corrupt JSON.

**Independent Test**: Force report persistence failure and resume-review creation failure; export a user record with malformed JSON and verify remaining data is returned.

### Tests for US4

- [x] T023 [P] [US4] Add gap report persistence outcome tests for `persisted: true` and `persisted: false` in `src/app/api/gap-detector/route.test.ts`.
- [x] T024 [P] [US4] Add resume-review rollback tests proving failed creation preserves the previous review in `src/app/api/resume-checker/route.test.ts`.
- [x] T025 [P] [US4] Add malformed JSON export tests for arrays, objects, and remaining unaffected records in `src/lib/utils/safe-json.test.ts` and `src/app/api/my-data/route.test.ts`.

### Implementation for US4

- [x] T026 [P] [US4] Implement `safeJsonParse` with caller-provided shape-correct fallback in `src/lib/utils/safe-json.ts`; use it for every JSON-encoded field in `src/app/api/my-data/route.ts`.
- [x] T027 [US4] Change `src/app/api/gap-detector/route.ts` to return the generated report plus additive `persisted: boolean`; handle save failure without discarding the report or returning success-shaped persisted state.
- [x] T028 [US4] Update `src/app/gap-detector/page.tsx` to show a visible, accessible warning when `persisted` is false while keeping the generated report visible.
- [x] T029 [US4] Wrap resume-review delete/create in one Prisma `$transaction` in `src/app/api/resume-checker/route.ts`.

## P1 — Correctness and AI Reliability

## Phase 6: User Story 5 — Preserve Ordered Interview State (P1)

**Goal**: Ensure interview answers are sequential, unique, atomically advanced, and summaries require five scored answers.

**Independent Test**: Submit index 3 at current index 0, repeat an answered index, and summarize an incomplete session; rejected operations leave state unchanged.

### Tests for US5 — write and run before implementation

- [x] T030 [P] [US5] Add ordered-answer, duplicate-answer, atomic advancement, and five-scored-answer completion tests in `src/app/api/interview/answer/route.test.ts`.
- [x] T031 [P] [US5] Add incomplete-summary rejection and completed-summary score tests in `src/app/api/interview/summary/route.test.ts`.
- [x] T032 [P] [US5] Add active-session completion-state tests requiring five non-null scores in `src/app/api/interview/active/route.test.ts`.

### Implementation for US5

- [x] T033 [US5] Update `src/app/api/interview/answer/route.ts` to reject non-current/duplicate question indexes with 409, persist answer and advance session atomically, and mark completion only after all five answers have scores.
- [x] T034 [US5] Update `src/app/api/interview/summary/route.ts` to refuse incomplete sessions with 409 and remove any default score substitution.
- [x] T035 [US5] Update `src/app/api/interview/active/route.ts` to derive completed state only from five ordered answers with non-null scores.

## Phase 7: User Story 6 — Keep Readiness Scores Consistent (P1)

**Goal**: Use a single pure readiness calculation across gap analysis, session summaries, and task progress.

**Independent Test**: Verify benchmark weights, match extremes, progress adjustments, clamping, and consistent use by each route.

### Tests

- [x] T036 [P] [US6] Add `computeReadiness` tests for all/none matched, required/good-to-have weights, AI priority overrides, task progress, and 10–98 clamps in `src/lib/scoring/compute-readiness.test.ts`.

### Implementation

- [x] T037 [US6] Add pure `computeReadiness` in `src/lib/scoring/compute-readiness.ts`, defining typed benchmark, matched/missing skill priority, and optional task-progress inputs.
- [x] T038 [US6] Replace duplicated readiness calculations with the shared helper in `src/app/api/gap-detector/route.ts`, `src/app/api/session/route.ts`, and `src/app/api/learning-plan/task/[taskId]/route.ts`.

## Phase 8: User Story 7 — Match Skills Exactly (P1)

**Goal**: Avoid substring false positives and consistently normalize a small documented alias set.

**Independent Test**: Confirm `java` never matches `javascript`, single-letter `c` does not match arbitrary skills, and approved aliases match their canonical form.

### Tests for US7 — write and run before implementation

- [x] T039 [P] [US7] Add normalization, exact match, punctuation/whitespace, `java`/`javascript`, single-letter `c`, and approved alias tests in `src/lib/scoring/skill-matching.test.ts`.

### Implementation for US7

- [x] T040 [US7] Add normalized exact skill matching and a small alias map (`js`→`javascript`, `node`→`node.js`, plus explicitly tested equivalents) in `src/lib/scoring/skill-matching.ts`.
- [x] T041 [US7] Replace skill substring comparisons in `src/app/api/gap-detector/route.ts`, `src/app/api/session/route.ts`, `src/app/api/learning-plan/task/[taskId]/route.ts`, `src/app/job-matches/page.tsx`, and `src/lib/ai/fallbacks/learning-plan.fallback.ts` with the shared matcher wherever skill equivalence is determined.

## Phase 9: User Story 8 — Bound AI Latency and Untrusted Inputs (P1)

**Goal**: Complete AI calls within the shared deadline, cancel pending work, reliably fall back, harden candidate content delimiters, and clamp scores.

**Independent Test**: Hang the provider, inject prompt-like resume/answer text, and return out-of-range AI scores; verify cancellation, fallback under 25 seconds, unchanged rubric, and valid scores.

### Tests for US8 — write and run before implementation

- [x] T042 [P] [US8] Add deadline, model/attempt cap, abort, timer cleanup, and deterministic fallback tests in `src/lib/ai/gemini.test.ts`.
- [x] T043 [P] [US8] Add prompt construction tests proving candidate answers/resume text are delimited as untrusted and the rubric-protection instruction is present in `src/lib/ai/prompts/interview.prompt.test.ts` and `src/lib/ai/prompts/resume-checker.prompt.test.ts`.
- [x] T044 [US8] Extend route-level tests for score clamping to interview 1–10 and resume/gap 0–100 results in `src/app/api/interview/answer/route.test.ts`, `src/app/api/interview/summary/route.test.ts`, `src/app/api/resume-checker/route.test.ts`, and `src/app/api/gap-detector/route.test.ts`.

### Implementation for US8

- [x] T045 [US8] Implement a shared ~22-second overall deadline, at most two models × two attempts, `AbortController` cancellation, and timer cleanup in `src/lib/ai/gemini.ts`.
- [x] T046 [US8] Delimit candidate answer and resume input as untrusted data and add system instructions that this data cannot alter evaluation rules in `src/lib/ai/prompts/interview.prompt.ts` and `src/lib/ai/prompts/resume-checker.prompt.ts`.
- [x] T047 [US8] Clamp validated AI score fields to their allowed ranges before persistence/response in `src/app/api/gap-detector/route.ts`, `src/app/api/resume-checker/route.ts`, `src/app/api/interview/answer/route.ts`, and `src/app/api/interview/summary/route.ts`.
- [x] T048 [US8] Verify every deterministic fallback branch retains `source: "fallback"` and the existing response shape in `src/app/api/gap-detector/route.ts`, `src/app/api/learning-plan/route.ts`, `src/app/api/resume-checker/route.ts`, `src/app/api/interview/start/route.ts`, `src/app/api/interview/answer/route.ts`, and `src/app/api/interview/summary/route.ts`.

## Phase 10: User Story 9 — Enforce AI and Interview Limits (P1)

**Goal**: Enforce a race-safe rolling quota of 20 AI invocations per user per hour and no more than three concurrent in-progress interview sessions.

**Independent Test**: Race concurrent invocations and interview starts for one user; no more than 20 quota reservations and three active sessions succeed; excess calls receive 429 with accurate `Retry-After`.

### Tests for US9 — write and run before implementation

- [x] T049 [P] [US9] Add rolling-window quota boundary, database-clock expiry, `Retry-After`, invalid-request non-consumption, and concurrent reservation tests in `tests/database/ai-usage.test.ts`.
- [x] T050 [P] [US9] Add concurrent interview start tests proving no fourth in-progress session is created in `src/app/api/interview/start/route.test.ts`.
- [x] T051 [P] [US9] Add route quota integration tests for all six AI endpoints in `tests/api/ai-rate-limit.test.ts`.

### Implementation for US9

- [x] T052 [US9] Implement per-user atomic rolling-window quota reservation, expired-row cleanup, and retry-seconds calculation in `src/lib/ai/rate-limit.ts` using `public.ai_usage` and the SQL transaction/RPC from `supabase/04_hardening.sql`.
- [x] T053 [US9] Enforce the quota after authentication and request validation but before AI work in `src/app/api/gap-detector/route.ts`, `src/app/api/learning-plan/route.ts`, `src/app/api/resume-checker/route.ts`, `src/app/api/interview/start/route.ts`, `src/app/api/interview/answer/route.ts`, and `src/app/api/interview/summary/route.ts`.
- [x] T054 [US9] Return HTTP 429 plus `Retry-After` without changing the existing error envelope in the six AI route handlers listed in T053.
- [x] T055 [US9] Implement the atomic per-user active-session count-and-create limit in `src/app/api/interview/start/route.ts` using the transaction/RPC and lock strategy defined in `supabase/04_hardening.sql`.

## Phase 11: User Story 10 — Configure Gemini Model Cascade (P1)

**Goal**: Use configured primary and fallback model IDs, filtering empty/duplicate entries within the attempt bound.

**Independent Test**: Supply primary/fallback configuration with duplicates and blanks; verify exact model order and at most two distinct model IDs are attempted.

### Tests for US10 — write and run before implementation

- [x] T056 [US10] Extend `src/lib/ai/gemini.test.ts` with model configuration parsing, deduplication, primary precedence, empty-value, and two-model cap tests; this shares a test file with US8.

### Implementation for US10

- [x] T057 [US10] Read primary `GEMINI_MODEL` and comma-separated `GEMINI_FALLBACK_MODELS`, discard empty/duplicate IDs, and cap the cascade at two models in `src/lib/ai/gemini.ts`.

## P2 — Database Configuration and Hygiene

## Phase 12: User Story 11 — Surface Database and Configuration Failures Safely (P2)

**Goal**: Expose accurate health state, remove silent SQL/config fallbacks, and restrict cleanup to explicitly configured test accounts.

**Independent Test**: Run schema SQL with a failing statement, omit Supabase configuration, force DB health failure, and run cleanup without/with a valid email domain.

### Tests for US11 — write and run before implementation

- [x] T058 [P] [US11] Add health response/status and server-side diagnostic tests in `src/app/api/health/route.test.ts`.
- [x] T059 [P] [US11] Add Supabase missing-environment failure tests in `src/lib/supabase/client.test.ts`, `src/lib/supabase/server.test.ts`, and `src/lib/supabase/middleware.test.ts`.
- [x] T060 [P] [US11] Add cleanup domain parsing, exact-domain matching, and fail-closed missing configuration tests in `scripts/cleanup-test-sessions.test.ts`.
- [x] T061 [P] [US11] Add SQL error-surfacing and rerun checks for schema entrypoint and migration in `tests/database/schema-runner.test.ts`.

### Implementation for US11

- [x] T062 [US11] Remove `EXCEPTION WHEN OTHERS THEN NULL` and make schema errors surface in `supabase/01_schema.sql`.
- [x] T063 [US11] Update browser/server Supabase clients and `src/lib/supabase/middleware.ts` to throw/report missing required environment values instead of using placeholder URLs or keys in any environment.
- [x] T064 [US11] Update `src/app/api/health/route.ts` to log database error details server-side and add `status: "ok" | "degraded"` while retaining `database` and `gemini` booleans with HTTP 200/503 status.
- [x] T065 [US11] Update `scripts/cleanup-test-sessions.ts` to require a valid `TEST_EMAIL_DOMAIN` and delete only profiles whose parsed email domain exactly equals that configured domain.
- [x] T066 [P] [US11] Add `*.tsbuildinfo` to `.gitignore`.
- [x] T067 [US11] Remove obsolete `prisma/temporary-storage.sql`.

## Final Phase: Documentation and Full Verification

**Purpose**: Update developer setup guidance only after implementation behavior and environment requirements are settled, then run all required verification commands.

- [x] T068 Update `.env.example` with safe placeholders for pooled `DATABASE_URL` (6543, `pgbouncer=true`, `connection_limit=1`), direct `DIRECT_URL` (5432), Supabase public URL/anon key, server-only service-role key, Gemini key/model/fallback models, and `TEST_EMAIL_DOMAIN`.
- [x] T069 Update `README.md` to describe Supabase Auth, Postgres, Prisma runtime/SQL schema source of truth (no Prisma migrations), current project file structure without `LearningRoadmapView`, accurate environment configuration, migration instructions, and `npx tsx scripts/cleanup-test-sessions.ts`.
- [x] T070 Run `npx prisma validate`.
- [x] T071 Run `npx prisma generate`.
- [x] T072 Run `npx tsc --noEmit`.
- [x] T073 Run `npx next lint`.
- [x] T074 Run `npx vitest run`.
- [x] T075 Run `npx next build`.
- [ ] T076 Run the end-to-end acceptance checklist in `specs/002-security-and-data-integrity-hardening/quickstart.md` against a disposable Supabase project and record any environment-dependent checks that cannot run locally. **Not run:** this requires a configured disposable Supabase project; migration application, Postgres cascades, RPC behavior, quota races, and Auth Admin deletion remain unverified here.

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundations)**: Vitest setup precedes story test work. US3 migration tests run before the migration and Prisma mirror are implemented.
- **P0 Phases 2–5**: Security and data-integrity changes must be completed before P1 behavior depends on the repaired ownership and schema invariants.
- **P1 Phases 6–11**: Interview ordering and scoring precede quota/integration verification; scoring and skill matching can be developed independently after the shared foundation.
- **P2 Phase 12**: Operational and cleanup behavior follows the core route/schema changes.
- **Final Phase**: Documentation follows completed implementation; verification tasks run in the exact listed order after docs and implementation are complete.

### User Story Dependencies

- **US1 (P0)**: Depends on authenticated route conventions only; independent of other story implementations.
- **US2 (P0)**: Independent request-validation work after Vitest setup.
- **US3 (P0)**: Migration and account deletion depend on US3 tests and cascade constraints; US9 quota depends on `ai_usage` created here.
- **US4 (P0)**: UI warning depends on the additive gap response; resume atomicity and export parsing are independent after tests.
- **US5 (P1)**: Depends on the unique-answer constraint from US3 (Phase 4).
- **US6 (P1)**: Independent pure scoring implementation; route integration depends on the shared function.
- **US7 (P1)**: Independent pure matcher; consumers depend on the shared module.
- **US8 (P1)**: Independent of persistence; AI routes rely on bounded deadline and fallback contract.
- **US9 (P1)**: Depends on `ai_usage` table/RPC from US3 (Phase 4); start cap and interview answer flow must coexist with US5 atomic state changes.
- **US10 (P1)**: Shares `src/lib/ai/gemini.ts` with US8; sequence changes in this file must be integrated, not overwritten.
- **US11 (P2)**: SQL error and env changes can run independently, but health tests require final route behavior.
- **US3 account deletion**: Requires `SUPABASE_SERVICE_ROLE_KEY` configured locally and in deployment; no credential value is stored in the repository.

### Parallel Opportunities

- Phase 1 Vitest configuration can be authored alongside dependency/script changes; tests run only after dependency installation.
- Within each story, `[P]` test tasks can be authored in parallel because they target distinct test files; implementation tasks touching the same route should be sequenced.
- US6 and US7 shared pure modules can be implemented in parallel. Their route integrations should avoid editing the same route concurrently.
- US8 and US10 both edit `src/lib/ai/gemini.ts`; perform tests first, then integrate code changes in a single coordinated change before the final test run.
- Final verification tasks T070–T075 are intentionally sequential to make failures attributable; T076 is the final acceptance run.

## Implementation Strategy

1. Complete Phase 1 and install the test tooling before writing/running user-story tests.
2. Complete the P0 workstreams US1–US4 and verify security/data-integrity outcomes before P1 changes.
3. Complete P1 US5–US10, maintaining test-first order for the explicitly requested workstreams.
4. Complete P2 US11 after P0/P1 behavior is stable.
5. Update `.env.example`, then README; run the full final verification sequence and the feature quickstart.

## Notes

- `[P]` means the task can proceed independently without editing the same files or depending on another task in its phase.
- Test tasks in US1, US2, US5, US7, US8, US9, US10, and US11 must be run and observed failing before their corresponding implementation begins.
- Do not edit feature 001 contract documents; `contracts/route-deltas.md` is the feature 002 delta.
- Run SQL against a disposable/development Supabase project first; do not run account deletion or destructive cleanup on production data.
