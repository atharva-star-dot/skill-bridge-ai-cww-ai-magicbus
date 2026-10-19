# API Contract Deltas: Security and Data Integrity Hardening

These deltas apply to feature 002. The feature 001 contracts remain unchanged. Existing success payload properties are retained unless an additive or explicitly authorized behavior change is listed below. Existing authenticated routes continue deriving user identity from Supabase Auth, never from a caller-supplied user ID.

## Shared Rules

- AI routes: `/api/gap-detector`, `/api/learning-plan`, `/api/resume-checker`, `/api/interview/start`, `/api/interview/answer`, and `/api/interview/summary`.
- AI quota: one validated invocation that proceeds to AI work consumes one user quota slot; retries and fallback are part of that invocation. Invalid and pre-AI rejected requests consume none.
- Quota rejection: HTTP `429`, existing error envelope retained, and `Retry-After: <integer seconds>` set to the seconds until the oldest counted invocation expires.
- Internal errors in gap-detector, resume-checker, and learning-plan task routes return generic client messages; detailed server logs exclude resume text and interview answers.
- No request accepts a user ID as authority for user-owned data; authenticated Supabase user ID is authoritative.

## `GET /auth/callback`

- Keep existing code-exchange behavior and callback success destinations.
- Accept `next` only if it is a safe same-origin relative path beginning with one `/`; reject absolute, protocol-relative, backslash, whitespace/control, and encoded variants after canonical decoding.
- Invalid or absent `next` resolves to `/dashboard` (unless existing onboarding logic directs a user with no target role to `/onboarding`).
- Authentication failure remains a redirect to `/login` with a generic message.

## Login page redirect (`src/app/login/page.tsx`)

- Validate `next` with the same safe-path rule before `router.push`.
- Unsafe values fall back to the existing role-aware destination (`/dashboard` for onboarded users, `/onboarding` otherwise); never pass an external URL to `router.push`.
- No request/response API contract change.

## `PATCH /api/learning-plan/task/[taskId]`

- Verify the task exists through its owning plan constrained to the authenticated `userId` before writing.
- Missing or non-owned task: HTTP `404`, generic not-found error body, no mutation.
- Task toggle, plan progress, and readiness updates must remain transactionally consistent.
- Internal error: generic `500` response; server log diagnostics only.
- Successful response shape remains unchanged.

## `POST /api/session`

- Validate body with Zod. Existing `sessionId` and optional field names remain unchanged.
- `targetRole`, when supplied: 2–100 characters.
- `currentSkills`, when supplied: at most 50 entries, each 1–60 characters.
- `readinessScore`, when supplied: integer 0–100.
- Invalid body: HTTP `400` with the repository's existing validation-error shape; no writes.
- Successful response remains the feature 001 session response with no removed or renamed fields.

## `GET /api/session`

- Preserve the existing authenticated session response shape and role-scoped summaries.
- Route-level readiness uses the shared readiness calculation; no response fields are removed or renamed.
- Database or auth failures must not expose internal diagnostic details.

## `POST /api/gap-detector`

- Enforce at most 50 current skills, each 1–60 characters; preserve existing role and resume input constraints.
- Keep the existing report fields and add `persisted: boolean`.
- Successful persistence: HTTP `200` with report and `persisted: true`.
- Database save failure: HTTP `200` with the generated report and `persisted: false`; the UI displays a visible warning that it was not saved.
- Validation remains HTTP `400`; generic service errors remain backward compatible with existing error payloads.
- Over-quota: HTTP `429` with `Retry-After`.

## `POST /api/learning-plan`

- Preserve request validation and current successful plan response.
- Enforce authenticated per-user AI quota before provider work.
- Over-quota: HTTP `429` with `Retry-After`.
- Existing database and AI error status/envelope remain unchanged unless needed to prevent internal error leakage.

## `GET /api/learning-plan/saved`

- No intended request or response shape change.
- User scoping remains tied to the authenticated Supabase user.

## `POST /api/resume-checker`

- Preserve success payload and existing request fields.
- Replace delete-then-create with an atomic Prisma transaction; a failed create leaves the previous review intact.
- Clamp returned AI score to the existing 0–100 feature range.
- Internal failure returns a generic message and safe diagnostics only; logs never include submitted resume text.
- Over-quota: HTTP `429` with `Retry-After`.

## `GET /api/my-data`

- Preserve export object shape.
- Corrupt JSON fields are parsed through `safeJsonParse` using shape-appropriate fallback values; one corrupt row must not fail the export.
- Logs must not include resume text or interview answers.

## `DELETE /api/my-data`

- Delete the authenticated user's profile and cascade-owned application data, then delete that same Auth user with server-only `SUPABASE_SERVICE_ROLE_KEY`.
- HTTP success only after both operations succeed.
- If profile deletion fails or Auth deletion fails: non-2xx generic error; never return a success-shaped body. If Auth deletion fails after the profile cascade, a retry must be permitted and complete Auth deletion.
- No `userId` request parameter/body is trusted for account selection.

## `POST /api/interview/start`

- Preserve existing successful start payload.
- Reject start when the authenticated user already has three in-progress sessions; return a conflict status and do not create a fourth session. Limit check and insert must be atomic.
- Consume one quota slot only when a valid start proceeds to AI work.
- Over-quota: HTTP `429` with `Retry-After`.

## `POST /api/interview/answer`

- Preserve successful per-question response shape.
- Require submitted `questionIndex` to equal the session's persisted current index; out-of-order or already-answered index returns HTTP `409` and changes no answer/session state.
- Answer insertion and question advancement are one transaction. Unique `(interview_session_id, question_index)` is the final duplicate guard.
- Candidate answer is untrusted delimited input; clamp AI score to 1–10 before storage/response.
- Over-quota: HTTP `429` with `Retry-After`.

## `POST /api/interview/summary`

- Preserve completed-session summary response shape.
- Refuse HTTP `409` for sessions without five answers each having a non-null score; do not default missing scores.
- Mark completed only after the complete-answer condition is verified.
- Clamp final interview rating to the existing 1–10 range.
- Over-quota: HTTP `429` with `Retry-After`.

## `GET /api/interview/active`

- Preserve response shape and authenticated user scoping.
- A session is reported as completed only if all five ordered answers have non-null scores.

## `GET /api/health`

- Add `status: "ok" | "degraded"` while preserving the existing `database` and `gemini` boolean fields.
- HTTP 200 for `ok`; HTTP 503 for `degraded`.
- Log database diagnostics server-side; do not include the raw database error in the response.

## Compatibility Summary

- Additive response field: `persisted` on gap-detector.
- Explicit additive response changes: health adds `status`; gap-detector adds `persisted`.
- Explicit error behavior: task ownership and incomplete/out-of-order interview operations return 404/409; AI quota returns 429 with `Retry-After`; session/gap validation rejects oversized inputs.
- All other feature 001 success contracts remain unchanged.
