# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- [Assumption about target users, e.g., "Users have stable internet connectivity"]
- [Assumption about scope boundaries, e.g., "Mobile support is out of scope for v1"]
- [Assumption about data/environment, e.g., "Existing authentication system will be reused"]
- [Dependency on existing system/service, e.g., "Requires access to the existing user profile API"]

# Feature Specification: Security and Data Integrity Hardening

**Feature Branch**: `002-security-and-data-integrity-hardening`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Harden the existing Skill Bridge AI application against authorization flaws, unsafe redirects, input and error handling weaknesses, data-integrity failures, incorrect scoring and interview state, unreliable AI timeouts, and database configuration and hygiene issues. Preserve existing user-facing behavior and API contracts in `specs/001-skill-gap-platform/contracts/` except for explicitly required compatible changes."

## User Scenarios & Testing

### User Story 1 - Protect User Data and Requests (Priority: P0)

As an authenticated user, I want every operation and redirect to be constrained to my account and to safe destinations, so that another user cannot change my data and I am not redirected to a malicious site.

**Why this priority**: Cross-user writes and open redirects are direct security vulnerabilities and must be resolved before lower-priority correctness or reliability work.

**Independent Test**: Authenticate as two users, attempt to patch the first user's task as the second user, and exercise callback and login redirects using external and malformed `next` values. Verify no unauthorized write occurs and every unsafe redirect falls back to the dashboard.

**Acceptance Scenarios**:

1. **Given** a task owned by user A, **When** user B patches its task ID, **Then** the endpoint returns 404 and the task remains unchanged.
2. **Given** a missing task ID, **When** an authenticated user patches it, **Then** the endpoint returns 404 without writing.
3. **Given** an unsafe `next` value (`@evil.com`, `//evil.com`, `https://evil.com`, or `/\evil.com`), **When** the auth callback or login processes it, **Then** navigation ends at `/dashboard`.
4. **Given** a safe same-origin path beginning with exactly one forward slash, **When** the auth callback or login processes it, **Then** the user is redirected to that path.
5. **Given** a route encounters an internal failure, **When** it returns an error response, **Then** clients receive a generic message and details are logged server-side without including resume text or interview answers.

### User Story 2 - Validate and Safely Persist User Data (Priority: P0)

As a user, I want submitted data to be validated and my account deletion to remove all associated data, so that malformed requests are rejected and successful deletion is complete and truthful.

**Why this priority**: Invalid persisted inputs undermine data integrity, while orphaned personal data after account deletion violates user expectations and privacy.

**Independent Test**: Submit invalid session and gap-detector skill values; delete a test account containing data in every child table; verify invalid requests are rejected and no rows or Auth user remain after a successful deletion.

**Acceptance Scenarios**:

1. **Given** a session update with a target role outside 2–100 characters, more than 50 skills, a skill longer than 60 characters, or a readiness score outside integer range 0–100, **When** it is submitted, **Then** validation rejects it before persistence.
2. **Given** a gap-detector request containing too many skills or a skill over 60 characters, **When** submitted, **Then** it is rejected using the same skill limits.
3. **Given** a user with related application data, **When** the user deletes their account, **Then** child data is deleted through profile foreign-key cascades and the corresponding Supabase Auth user is deleted using server-side administrative credentials.
4. **Given** either the application-data deletion or Auth-user deletion fails, **When** account deletion completes, **Then** the endpoint reports an error and never reports success.
5. **Given** a profile is missing during the safe backfill, **When** the migration runs, **Then** a profile is created from its Auth user without overwriting an existing profile.
6. **Given** a gap analysis is generated but its database save fails, **When** the route returns, **Then** it includes the report with `persisted: false`, and the UI visibly warns that it was not saved.
7. **Given** a resume review is replaced, **When** deletion or creation fails, **Then** the prior operation is rolled back rather than leaving a delete-only partial result.
8. **Given** an exported record contains corrupt JSON, **When** a user exports their data, **Then** the export completes and safely represents that field instead of failing the entire request.

### User Story 3 - Preserve Correct Interview and Readiness Results (Priority: P1)

As a user, I want interview progress and readiness scores to reflect the actual answers and skills recorded, so that results are consistent, ordered, and trustworthy.

**Why this priority**: Incorrect completion states or readiness calculations make the central coaching outputs misleading even when requests are authorized and persisted.

**Independent Test**: Exercise out-of-order and duplicate interview answers; summarize incomplete and complete sessions; run readiness unit tests for matching and weighting; verify session, task, and gap-analysis flows use the same readiness calculation.

**Acceptance Scenarios**:

1. **Given** an interview session whose current question is not question 4, **When** question 4 is answered first, **Then** the endpoint returns 409 and records no answer.
2. **Given** a question already has an answer, **When** it is submitted again, **Then** the endpoint returns 409 and preserves the original answer.
3. **Given** fewer than five scored answers, **When** a summary is requested, **Then** the request is refused and the session is not marked complete.
4. **Given** five answers but at least one has no score, **When** session status is evaluated, **Then** it is not considered completed.
5. **Given** a known role benchmark, **When** matched and missing skills are scored, **Then** both use one consistent priority scale: required skills are High, good-to-have skills are Medium unless the AI explicitly marks another priority.
6. **Given** skills such as `java` and `javascript`, **When** matching runs, **Then** `java` does not match `javascript`; normalized exact matching and the shared, limited alias map are used consistently.
7. **Given** the readiness score is read or recalculated by session, task-update, or gap-analysis flows, **When** it is computed, **Then** each flow uses the same pure readiness calculation.
8. **Given** readiness scoring is unit tested, **When** all skills match, none match, similar non-equivalent names are compared, or High/Medium/Low weights are exercised, **Then** results meet the defined expected cases, including a floor when none match.

### User Story 4 - Keep AI Responses Bounded and Abuse-Resistant (Priority: P1)

As a user, I want AI-backed operations to remain responsive, private, and fairly limited, so that slow providers fall back safely and untrusted inputs cannot alter evaluation rules.

**Why this priority**: AI routes handle sensitive user content and can exceed serverless time limits or be abused without bounded calls and per-user quotas.

**Independent Test**: Simulate a non-responsive Gemini provider, inject instruction-like text in candidate content, exceed a user's hourly quota, and start more than three active interviews. Verify fallback latency, score bounds, and rejection behavior.

**Acceptance Scenarios**:

1. **Given** a Gemini request that hangs, **When** an AI route runs, **Then** the overall operation ends within 25 seconds and returns its deterministic fallback with `source: "fallback"`.
2. **Given** multiple configured Gemini model IDs and retries, **When** the overall deadline is reached, **Then** no more than two models and two attempts per model are used, outstanding requests are cancelled, and timers are cleared.
3. **Given** an answer or resume containing instruction-like text, **When** it is evaluated, **Then** user content is delimited as untrusted data, cannot change the system rubric, and returned scores are clamped to the valid range.
4. **Given** a user has reached the configured default of 20 AI calls in one hour, **When** they request another AI operation, **Then** all applicable AI routes respond with 429 and a `Retry-After` value.
5. **Given** a user already has three in-progress interview sessions, **When** they try to start another, **Then** the request is rejected and no fourth session is created.
6. **Given** a configured primary Gemini model and comma-separated fallback model configuration, **When** the AI client initializes its model sequence, **Then** it uses the configured primary and environment-provided fallback IDs rather than a hardcoded backup list.

### User Story 5 - Make Operations and Configuration Fail Clearly (Priority: P2)

As an operator, I want database and Supabase failures to be observable without exposing internals, and setup guidance to reflect the actual system, so that production issues are diagnosable and the project can be configured safely.

**Why this priority**: Clear failure signals and accurate setup documentation reduce deployment and maintenance errors after the security and correctness issues are addressed.

**Independent Test**: Cause a database health check failure, omit production Supabase credentials, run the schema SQL with an invalid statement, and follow the updated environment and README instructions.

**Acceptance Scenarios**:

1. **Given** the database health query fails, **When** `/api/health` responds, **Then** the detailed failure is logged server-side and the public body contains only `{ "status": "degraded" }`.
2. **Given** the database health query succeeds, **When** `/api/health` responds, **Then** the public body contains only `{ "status": "ok" }`.
3. **Given** production Supabase URL or public key configuration is missing, **When** a Supabase client is created, **Then** it fails clearly instead of connecting to a placeholder host.
4. **Given** a statement in `supabase/01_schema.sql` fails, **When** the schema is applied, **Then** the error is surfaced rather than swallowed.
5. **Given** the project setup documentation is followed, **When** a developer configures the app, **Then** `.env.example` and README consistently describe Supabase Auth, Postgres pooler and direct URLs, SQL schema ownership, current file structure, and the correct cleanup command.
6. **Given** cleanup runs without an explicit test email domain, **When** it considers profile deletion, **Then** it does not delete profiles; with a configured domain, it deletes only profiles whose email ends in that domain.
7. **Given** repository hygiene is checked, **When** generated TypeScript build-info files or the obsolete temporary SQLite schema are present, **Then** build-info files are ignored and `prisma/temporary-storage.sql` is absent.

### Edge Cases

- A task disappears between its ownership lookup and update; the operation must not modify a task that cannot be verified as owned.
- `next` values may contain encoded separators, backslashes, protocol-relative paths, absolute URLs, or whitespace; validation must be applied to the effective destination and must not permit origin changes.
- A deletion may succeed in one persistence system and fail in another. The response must not claim success; partial-failure behavior must be diagnosable without leaking secrets.
- The Auth user may exist without a profile, or a profile may already exist during backfill; migration must be safe to rerun and preserve existing profile data.
- AI quota counters may be concurrently incremented by simultaneous requests; the configured limit must not be bypassed through concurrent calls.
- A provider may return malformed output, scores outside allowed ranges, or fail after partial retries; deterministic fallback and server-side validation must still apply.
- Gemini configuration may contain empty or duplicate fallback model identifiers; invalid entries must not cause unbounded calls.
- Cleanup must not treat arbitrary addresses containing the word `test` as test accounts.
- A corrupt JSON value in one exported row must not prevent other user data from being exported.

## Requirements

### Functional Requirements

#### P0 - Security

- **FR-001**: The system MUST verify task ownership before any task write; missing and non-owned tasks MUST return 404 without changing data.
- **FR-002**: The system MUST accept post-authentication redirect destinations only when they are same-origin relative paths beginning with exactly one `/`; it MUST reject protocol-relative paths, backslashes, absolute URLs, and equivalent encoded variants, falling back to `/dashboard`.
- **FR-003**: The system MUST apply the same redirect validation to `/auth/callback` and the `next` parameter handled by the login page.
- **FR-004**: The gap-detector, resume-checker, and learning-plan task routes MUST return generic client-facing errors and log diagnostic details server-side. Logs MUST NOT contain resume text or interview answers.
- **FR-005**: The system MUST validate `POST /api/session` request bodies with Zod. `targetRole` MUST be 2–100 characters when supplied; `currentSkills` MUST contain at most 50 strings, each at most 60 characters; and `readinessScore` MUST be an integer from 0 through 100 when supplied.
- **FR-006**: The system MUST apply the same maximum skill count and per-skill length limits to `GapDetectorInputSchema`.

#### P0 - Data Integrity

- **FR-007**: Application child-table foreign keys MUST reference `public.profiles(id)` with `ON DELETE CASCADE`.
- **FR-008**: The database change MUST include a safe, repeatable backfill that creates missing profile rows from `auth.users` without overwriting existing profile data, and a migration SQL file.
- **FR-009**: `DELETE /api/my-data` MUST delete both the user's application data and Supabase Auth user through the admin API using the server-only `SUPABASE_SERVICE_ROLE_KEY`. It MUST report failure if either deletion fails and MUST NOT report success for a partial deletion.
- **FR-010**: Gap analysis MUST return its report and a boolean `persisted` value reflecting whether the database save succeeded. The UI MUST warn when the value is false.
- **FR-011**: Resume-review replacement MUST execute deletion and creation within one Prisma transaction.
- **FR-012**: User data export MUST tolerate an individual malformed JSON field through a shared safe JSON parsing helper and continue exporting the remaining data.

#### P1 - Correctness

- **FR-013**: Interview answers MUST match the session's current question index; out-of-order or already answered question submissions MUST return 409 without changing answer state.
- **FR-014**: An interview session MUST be complete only when all five questions have answers with scores. Summary generation MUST refuse incomplete sessions and MUST NOT substitute a default score.
- **FR-015**: The interview-answer data model MUST enforce uniqueness for each `(interviewSessionId, questionIndex)` pair.
- **FR-016**: Readiness scoring MUST derive skill weights from the role benchmark so required skills are High and good-to-have skills are Medium unless an explicit AI priority overrides the benchmark.
- **FR-017**: Skill matching MUST use normalized exact matching and a small shared alias map; substring matching MUST NOT match non-equivalent skills such as `java` and `javascript` or `c` and arbitrary strings.
- **FR-018**: The system MUST provide one pure `computeReadiness()` function in `src/lib/scoring/` and use it for readiness calculation in session GET, task PATCH, and gap-detector flows.

#### P1 - AI Reliability

- **FR-019**: Gemini calls MUST observe one overall deadline of approximately 22 seconds, use no more than two configured models and two attempts per model, cancel outstanding requests with `AbortController`, and clear timers when calls finish.
- **FR-020**: On Gemini deadline expiry or provider failure, applicable AI routes MUST return their deterministic fallback with `source: "fallback"` within 25 seconds.
- **FR-021**: Candidate answers and resume text MUST be explicitly delimited as untrusted input, and the system instruction MUST state that delimited content cannot change evaluation rules or rubrics.
- **FR-022**: Scores originating from AI responses MUST be clamped server-side to the valid feature-specific range.
- **FR-023**: The system MUST enforce a Postgres-backed per-user AI quota on gap-detector, learning-plan, resume-checker, interview start, interview answer, and interview summary routes. The default MUST be 20 AI calls per user per hour; rejected calls MUST return 429 with `Retry-After`.
- **FR-024**: The system MUST permit no more than three in-progress interview sessions per user.
- **FR-025**: The Gemini primary model MUST use `GEMINI_MODEL`; backup model IDs MUST be read from comma-separated `GEMINI_FALLBACK_MODELS` rather than a hardcoded list.

#### P2 - Database Configuration and Hygiene

- **FR-026**: `supabase/01_schema.sql` MUST surface SQL errors and MUST NOT swallow exceptions using `EXCEPTION WHEN OTHERS THEN NULL`.
- **FR-027**: Supabase clients MUST fail clearly when required configuration is missing in production and MUST NOT silently use a placeholder Supabase URL.
- **FR-028**: `/api/health` MUST log the real database error server-side and expose only `{ "status": "ok" }` or `{ "status": "degraded" }`.
- **FR-029**: `.env.example` MUST document `DATABASE_URL` using the Supabase pooler on port 6543 with `pgbouncer=true` and `connection_limit=1`; `DIRECT_URL` using port 5432; `NEXT_PUBLIC_SUPABASE_URL`; `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `SUPABASE_SERVICE_ROLE_KEY`; `GEMINI_API_KEY`; `GEMINI_MODEL`; and `GEMINI_FALLBACK_MODELS`.
- **FR-030**: The README MUST describe Supabase Auth, Postgres, SQL files under `supabase/` as the schema source of truth, the current repository structure (excluding the removed `LearningRoadmapView` entry), and `npx tsx scripts/cleanup-test-sessions.ts`; it MUST NOT instruct users to use guest/localStorage auth, SQLite, or Prisma migrations.
- **FR-031**: The cleanup script MUST delete only profiles whose email ends with the explicitly configured `TEST_EMAIL_DOMAIN`; absent configuration MUST NOT broaden deletion.
- **FR-032**: The repository MUST ignore `*.tsbuildinfo` files and MUST remove the obsolete `prisma/temporary-storage.sql`.

### API and Compatibility Requirements

- Existing contracts under `specs/001-skill-gap-platform/contracts/` MUST remain unchanged.
- The `persisted` boolean required for gap-detector responses is an explicitly required compatible response extension; existing report fields and behavior MUST be preserved.
- Validation and error handling changes MUST preserve existing success behavior and response shapes except where explicitly required above.
- The public health response changes to the explicitly required `{ "status": "ok" | "degraded" }` shape.
- New environment variables MUST be server-only unless explicitly prefixed `NEXT_PUBLIC_`; the service-role key MUST never be exposed to browser code.

### Key Entities

- **Profile**: The application representation of a Supabase Auth user; its identifier is the Auth user ID, and it owns the user's reports, plans, reviews, and interview sessions.
- **AI Usage Counter**: A Postgres-backed per-user record of AI calls used to enforce an hourly quota.
- **Interview Session and Answer**: A five-question ordered interaction; each session/question pair is unique and completion requires five scored answers.
- **Role Benchmark**: Required and good-to-have competencies used consistently for exact skill matching and readiness weights.
- **Redirect Destination**: A validated same-origin relative path supplied after authentication; invalid values resolve to `/dashboard`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: User B receives 404 and there is no database change when patching a task owned by user A.
- **SC-002**: `/auth/callback` and login redirect `next` values `@evil.com`, `//evil.com`, `https://evil.com`, and `/\evil.com` all land on `/dashboard`; valid same-origin paths continue to work.
- **SC-003**: After successful `DELETE /api/my-data`, zero rows remain for that user in every application table and the Supabase Auth user no longer exists.
- **SC-004**: Answering interview question 4 first returns 409, creates no answer for that request, and does not complete the session.
- **SC-005**: `computeReadiness()` unit tests verify that all matched skills score highly, no matched skills meet the floor, `java` does not match `javascript`, and High/Medium/Low weights behave as specified.
- **SC-006**: With Gemini hanging, each AI route responds within 25 seconds with deterministic output marked `source: "fallback"`.
- **SC-007**: A user over the default hourly quota receives 429 with `Retry-After`; a fourth concurrent in-progress interview session is not created.
- **SC-008**: Each listed protected error route returns a generic client-facing error while server logs retain actionable diagnostics and contain no resume text or interview answers.
- **SC-009**: Invalid session and gap-detector skill inputs are rejected before persistence according to the specified limits.
- **SC-010**: A successful account deletion removes application rows and the Auth user; if either operation fails, the endpoint does not return success.
- **SC-011**: `tsc --noEmit` and `next lint` both complete with zero errors.

## Assumptions

- Supabase Auth remains the authentication provider and `public.profiles.id` corresponds to `auth.users.id`.
- The SQL schema in `supabase/` is the source of truth; no new infrastructure beyond the existing Postgres database is introduced.
- The current five-question interview length and existing feature score ranges remain unchanged.
- The hourly AI quota defaults to 20 calls per authenticated user and is enforced using the database clock or an equivalent consistent time window.
- A configured test email domain is an explicit domain suffix, not a substring or a default inferred from email contents.
- The existing API contracts in feature 001 are immutable for this work except for requirement-authorized validation, error, health, and `persisted` response changes described above.

## Out of Scope

- New user-facing features or AI capabilities.
- Changes to Gemini prompt content beyond explicitly specified untrusted-input hardening.
- UI redesigns.
- Changes to existing API contracts beyond the expressly required compatible changes in this specification.
