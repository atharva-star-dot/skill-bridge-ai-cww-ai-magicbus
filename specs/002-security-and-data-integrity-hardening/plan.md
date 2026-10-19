# Implementation Plan: Security and Data Integrity Hardening

**Branch**: `002-security-and-data-integrity-hardening` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-security-and-data-integrity-hardening/spec.md`

## Summary

Harden authorization, redirects, request validation, persistence, interview sequencing, scoring, AI provider deadlines, and operational diagnostics while preserving the feature 001 API contracts. Keep Prisma 5 as the runtime ORM, use `supabase/*.sql` as the only schema-change source, and keep `prisma/schema.prisma` structurally synchronized with that SQL. Ship an idempotent `supabase/04_hardening.sql`, append it to `supabase/00_RUN_ALL.sql`, and test pure scoring/security behavior with Vitest.

## Technical Context

**Language/Version**: TypeScript, Node.js 20+, Next.js 14 App Router

**Primary Dependencies**: Prisma 5.21, `@prisma/client`, `@supabase/ssr`, Supabase Auth, Zod, Google Generative AI; add Vitest as a dev dependency for focused unit tests.

**Storage**: Supabase Postgres; Prisma Client connects at runtime using the Supabase transaction pooler, while SQL files in `supabase/` own schema changes. `DIRECT_URL` is reserved for direct database maintenance/introspection tools, not runtime queries.

**Testing**: Add Vitest as a dev dependency and add an `npm test` script. Use Vitest unit tests for `computeReadiness`, exact skill matching, safe redirects, and safe JSON parsing; route/integration tests or manual acceptance checks for ownership, persistence transactions, interview ordering, rate limiting, Auth deletion, and fallback deadlines. Run `tsc --noEmit` and `next lint`.

**Target Platform**: Vercel serverless deployment, region `bom1`; existing AI route maximum duration is 30 seconds.

**Project Type**: Next.js web application with App Router route handlers and Prisma/Postgres persistence.

**Performance Goals**: Gemini overall deadline approximately 22 seconds; every AI route returns deterministic fallback within 25 seconds and within Vercel's 30-second maximum.

**Constraints**: No paid infrastructure. Maintain API compatibility with feature 001 contracts except explicitly additive fields and required health/error behavior. SQL migrations must be idempotent. `prisma/schema.prisma` mirrors the SQL schema, but Prisma Migrate is not used. Service-role credentials remain server-only. Connection pool use must avoid exhausting Supabase/Vercel connection limits.

**Scale/Scope**: Existing application and all routes using `src/lib/db.ts`; nine current Prisma models, six AI endpoints, auth callbacks, session APIs, and cleanup/seed scripts.

## Constitution Check

| Principle | Status | Plan alignment |
|---|---|---|
| I. Rapid MVP with Proven Technology | Pass | Retains existing Next.js, Prisma, Postgres, Supabase Auth, and Zod; adds only requested Vitest tests. |
| II. Server-Side Structured AI with Zod Validation | Pass | AI remains in route handlers, response schemas remain validated, and inputs are validated before AI calls. |
| III. Fault Isolation & Independent Features | Pass | Each AI route retains its deterministic fallback; persistence failures are surfaced without fabricating saved state. |
| IV. Mobile-First, Accessible & Resilient UX | Pass | Existing UI is retained; only a visible unsaved-report warning and explicit error states are added. |
| V. Fast Manual Verifiability | Pass | Adds focused unit tests and executable route acceptance checks for each security/data invariant. |
| VI. Windows PowerShell & Platform Compatibility | Pass | Documented commands use PowerShell-compatible `npm`, `npx`, and SQL editor workflows. |

**Gate**: Pass. No new service, paid infrastructure, or speculative abstraction is introduced.

### Post-Design Gate

Pass: all persistent schema changes are expressed in idempotent SQL and mirrored in Prisma; contract deltas are additive or explicitly required; each multi-write invariant has a transaction/locking strategy; test and deployment budgets remain within the stated limits.

## Design and Implementation Sequence

1. **Lock contracts and shared primitives**
   - Keep the feature 001 contract documents unchanged.
   - Add `contracts/route-deltas.md` defining route-by-route request, response, status, header, and compatibility changes.
   - Add shared redirect validation, `safeJsonParse`, normalized skill matching/aliases, and pure `computeReadiness` under `src/lib/`.
   - Add Vitest config, focused tests, and an `npm test` script; add `vitest` to dev dependencies and update the lockfile.
2. **Ship schema hardening**
   - Add idempotent `supabase/04_hardening.sql` for profile backfill, profile-owned foreign-key repair, interview-answer uniqueness, and the `ai_usage` event table/indexes.
   - Make schema prerequisites explicit and allow SQL failures to surface.
   - Append the new migration to `supabase/00_RUN_ALL.sql`.
   - Mirror every changed table, relation, unique/index declaration, and mapped column in `prisma/schema.prisma`.
   - Do not run `prisma migrate`; validate the SQL and Prisma schema against the same resulting database shape.
3. **Fix authorization, input validation, and deletion/persistence**
   - Verify task ownership before mutation; atomically persist interview answer plus session advancement.
   - Validate session and gap-detector bodies using the requested Zod limits.
   - Add safe same-origin redirect validation to callback and login.
   - Add generic client error messages with safe server diagnostics; exclude sensitive body fields from logs.
   - Implement cascade-backed profile deletion followed by Supabase Auth admin deletion; report partial failure and permit retries.
   - Make resume-review replacement transactional, gap report persistence observable, and data export tolerant of corrupt JSON.
4. **Unify scoring and interview correctness**
   - Use exact normalized skill matching and one alias map.
   - Derive skill weights from role benchmarks and AI priority overrides.
   - Replace duplicated readiness recalculation with `computeReadiness`.
   - Enforce sequential/unique interview answers, complete only with five scored answers, and reject incomplete summaries.
5. **Bound and limit AI work**
   - Limit model attempts to two models by two attempts under a shared approximately 22-second deadline; abort pending network work and clear timers.
   - Resolve backup models from `GEMINI_FALLBACK_MODELS`; preserve fallback payload shape.
   - Delimit untrusted answer/resume content and clamp returned scores.
   - Add atomic per-user rolling-hour quota reservation (default 20), `Retry-After`, and atomic three-session cap.
6. **Operational hygiene and verification**
   - Make Supabase configuration fail clearly rather than silently using placeholders.
   - Add the health `status` field while retaining existing `database`/`gemini` booleans; log database diagnostics server-side.
   - Update `.env.example`, README, cleanup script, `.gitignore`; remove `prisma/temporary-storage.sql`.
   - Run focused Vitest tests, `tsc --noEmit`, `next lint`, and the feature acceptance checklist in `quickstart.md`.

## Data and Transaction Boundaries

- **Task PATCH**: obtain the authenticated user; find the task through its plan constrained to `plan.userId`; only then update. A transaction rechecks ownership and performs task, plan progress, and profile readiness updates consistently; missing/non-owned task returns 404.
- **Account delete**: delete the profile in Postgres first (cascade removes application data), then call `auth.admin.deleteUser(userId)`. If Auth deletion fails, return an explicit error; the Auth account remains available to retry, and retry treats a missing profile as already deleted. Never report full success until both steps succeed.
- **Resume review replacement**: one Prisma `$transaction` deletes and creates the review, so failed creation retains the old row.
- **Interview answer**: lock the session row in a transaction; verify owner/current index/no prior answer; insert answer; advance index; mark complete only if all five answers have non-null scores.
- **Interview start limit**: serialize concurrent starts per user with a transaction-scoped advisory lock or a lock on that user's profile, count in-progress sessions, then create only if fewer than three exist.
- **AI quota**: reserve quota before provider work through a transaction that serializes reservations per user, removes expired rows, counts usage inside the rolling preceding 60 minutes using database time, and inserts the current invocation only if below 20. Return retry seconds until the oldest counted row expires.
- **Readiness**: `computeReadiness` is pure and receives benchmark skills, matched skills, explicit missing-skill priorities, and task progress as appropriate; routes supply already loaded data and remain responsible for persistence.

## Project Structure

### Documentation (this feature)

```text
specs/002-security-and-data-integrity-hardening/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── route-deltas.md
```

### Source Code

```text
src/
├── app/
│   ├── api/
│   │   ├── gap-detector/route.ts
│   │   ├── health/route.ts
│   │   ├── interview/{active,answer,start,summary}/route.ts
│   │   ├── learning-plan/route.ts
│   │   ├── learning-plan/saved/route.ts
│   │   ├── learning-plan/task/[taskId]/route.ts
│   │   ├── my-data/route.ts
│   │   ├── resume-checker/route.ts
│   │   └── session/route.ts
│   ├── auth/callback/route.ts
│   ├── login/page.tsx
│   └── gap-detector/page.tsx
├── lib/
│   ├── ai/{gemini.ts,prompts/,fallbacks/}
│   ├── scoring/{compute-readiness.ts,skill-matching.ts}
│   ├── schemas/
│   ├── supabase/{client.ts,server.ts,middleware.ts}
│   └── utils/{redirect.ts,safe-json.ts}
└── __tests__/
    ├── scoring/
    ├── security/
    └── utils/
prisma/schema.prisma
supabase/{01_schema.sql,02_auth_and_security.sql,03_seed.sql,04_hardening.sql,00_RUN_ALL.sql}
scripts/{cleanup-test-sessions.ts,seed.ts}
vitest.config.ts
```

**Structure Decision**: Keep the current single Next.js project. Add only narrowly scoped pure helper modules and unit tests; database behavior stays in existing route handlers and Prisma, with DDL and functions in Supabase SQL.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Existing user data references `auth.users`, and FK replacement may fail or orphan users without profiles. | Backfill profiles with `ON CONFLICT DO NOTHING`; validate orphan counts before replacing constraints; perform constraint changes transactionally where supported. |
| `00_RUN_ALL.sql` and standalone SQL files are rerun against partially migrated installations. | Use guarded constraint discovery/drop, `IF NOT EXISTS`, conflict-safe backfill, and idempotent function/index definitions. |
| Prisma pooler connections exceed Supabase client/backend limits under Vercel concurrency. | Use transaction pooler and a low per-instance `connection_limit=1`; monitor usage and keep `DIRECT_URL` out of runtime. |
| Race conditions bypass quota or interview limits. | Serialize reservation and creation by authenticated user in one database transaction; test simultaneous requests. |
| AI deadline cancellation is not propagated to every SDK transport. | Verify SDK cancellation support for the installed version; if the SDK cannot abort reliably, use a supported fetch transport or bounded REST request without exceeding the same deadline. |
| Auth deletion can fail after profile cascade has committed. | Return failure, log safe diagnostics, leave Auth account intact for retry, and make retry idempotent. |

## Complexity Tracking

No constitution violations or new infrastructure are required. The SQL/Prisma dual representation is retained only because the user explicitly requires SQL as deployment truth and Prisma as the runtime/model mirror.
