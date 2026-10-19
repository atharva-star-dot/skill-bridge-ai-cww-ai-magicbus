# Verification Quickstart: Security and Data Integrity Hardening

## Prerequisites

- Windows PowerShell and Node.js 20+.
- Dependencies installed with `npm install`.
- Supabase Auth/Postgres project configured in `.env.local`.
- `DATABASE_URL` is the Supabase transaction pooler URL (port 6543, `pgbouncer=true`, `connection_limit=1`); `DIRECT_URL` is the direct Postgres URL (port 5432).
- `SUPABASE_SERVICE_ROLE_KEY` is configured server-side only for Auth-user deletion. Never put it in a `NEXT_PUBLIC_` variable or commit it.
- Use a non-production Supabase project for database migration and deletion tests.

## Apply and Verify SQL Schema

1. Back up or use a disposable development Supabase project.
2. In Supabase SQL Editor, run `supabase/00_RUN_ALL.sql`.
3. Run the same file a second time to verify idempotency.
4. Verify `ai_usage`, updated profile foreign keys, and the unique `(interview_session_id, question_index)` constraint exist.
5. Run `npx prisma validate` and `npx prisma generate`; do not run `prisma migrate`.

## Local Quality Gates

From the repository root:

```powershell
npm run test -- --run
npx tsc --noEmit
npm run lint
```

The new unit tests must cover readiness weighting/floor/ceiling, exact `java` versus `javascript` matching, configured aliases, safe redirect cases, and malformed JSON fallback behavior.

## API Acceptance Checks

Use two test accounts and known seed data. Do not use real resumes or interview answers in logs or fixtures.

1. Patch a task owned by account A while authenticated as B. Expect `404`; verify the task remains unchanged.
2. Try callback/login `next` values `@evil.com`, `//evil.com`, `https://evil.com`, `/\evil.com`, and encoded equivalents. Expect `/dashboard` or the existing onboarding flow for a user without a profile role; never an external host.
3. Submit 51 skills and a skill over 60 characters to `/api/session` and `/api/gap-detector`. Expect `400` and no persistence.
4. Force a gap report DB save failure. Expect the report payload plus `persisted: false` and a visible unsaved warning.
5. Cause a resume-review create failure after a prior review exists. Verify transaction rollback retains the prior review.
6. Submit interview index 3 while current index is 0, then submit a duplicate answer. Expect `409` and no rejected answer/state update. Request summary before all five scored answers; expect `409`.
7. With a test user, exceed 20 AI workflow calls in a rolling hour. Expect HTTP `429` and `Retry-After`; retry after expiry. Start concurrent interviews and verify no more than three remain in progress.
8. Simulate a hanging Gemini request. Confirm deterministic fallback with `source: "fallback"` arrives within 25 seconds and the outstanding request is aborted.
9. Export test data with one malformed JSON field; verify export succeeds and other records remain.
10. Delete a test account. Confirm all user-owned application rows and its Auth user are gone. Simulate Auth deletion failure and confirm the endpoint reports failure and a retry can finish.
11. Force DB unavailability on `/api/health`. Expect HTTP `503` with `status: "degraded"` and the existing `database`/`gemini` booleans; inspect server logs for diagnostics, not client output.

## Manual UI Check

Run `npm run dev`, generate a gap report while forcing its persistence failure, and confirm the UI displays a clear warning that the report was not saved without hiding the generated report.
