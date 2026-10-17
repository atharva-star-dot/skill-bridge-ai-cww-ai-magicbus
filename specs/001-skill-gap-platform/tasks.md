# Implementation Tasks: Skill Bridge AI Platform

**Feature Branch**: `001-skill-gap-platform`
**Specification**: [specs/001-skill-gap-platform/spec.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/spec.md)
**Implementation Plan**: [specs/001-skill-gap-platform/plan.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/plan.md)
**Created**: 2026-10-17

---

## Phase 1: Setup, Design System, Layout & Landing Page

**Purpose**: Establish application foundation, UI primitives, database connection, AI client, seed data, and public landing page.

- [x] T001 Initialize Next.js 14+ project with TypeScript, Tailwind CSS, App Router, and ESLint in repository root
- [x] T002 [P] Configure environment variable validation and provide template in `.env.example`
- [x] T003 [P] Configure Tailwind typography, color tokens, and shadcn/ui primitives (Button, Card, Badge, Progress, Dialog, Tabs) in `src/components/ui/`
- [x] T004 [P] Setup Prisma schema with 9 models (Session, TargetRole, SkillGapReport, LearningPlan, PlanTask, ResumeReview, InterviewSession, InterviewAnswer, JobRole) in `prisma/schema.prisma`
- [x] T005 [P] Create Prisma database client singleton with connection caching in `src/lib/db.ts`
- [x] T006 [P] Implement server-side Gemini client with exponential backoff retry and markdown sanitization in `src/lib/ai/gemini.ts`
- [x] T007 [P] Create curated seed datasets for 25 popular entry-level roles and 40 Indian tech jobs in `src/data/seed-roles.ts` and `src/data/seed-jobs.ts`
- [x] T008 Implement database seed script runnable with Windows PowerShell (`npm run seed`) in `scripts/seed.ts`
- [x] T009 [P] Implement responsive global Navigation Bar with guest session indicator and Footer in `src/components/shared/Navbar.tsx` and `src/components/shared/Footer.tsx`
- [x] T010 Implement high-converting Landing Page with hero section, problem overview, 5 feature previews, and "Get Started" CTA in `src/app/page.tsx`

---

## Phase 2: Onboarding & Skill Gap Detector (Hero Feature - US1 & US3)

**Goal**: Deliver a fully functioning end-to-end Skill Gap Detector and guest onboarding flow. Users enter/select a role and current skills (or paste a resume) and immediately receive a 0–100 readiness score and prioritized missing skills.

**Independent Test**: Navigate to `/onboarding`, select "Junior Frontend Developer", enter `HTML, CSS, JavaScript, React`, click Analyze, and verify that a 0–100 score gauge, matched skills, and High/Medium/Low missing skills with rationale are rendered within 3 seconds.

- [ ] T011 [P] [US1] Create Zod validation schema for skill gap input and structured output in `src/lib/schemas/gap-detector.schema.ts`
- [ ] T012 [P] [US1] Create AI prompt template for role skill benchmarking and gap prioritization in `src/lib/ai/prompts/gap-detector.prompt.ts`
- [ ] T013 [US1] Implement POST route handler with Gemini JSON mode, Zod safe-parsing, and database persistence in `src/app/api/gap-detector/route.ts`
- [ ] T014 [P] [US1] Implement interactive Skill Tag & Role Selector component with preset seed pills in `src/components/shared/SkillTagInput.tsx`
- [ ] T015 [P] [US1] Implement animated SVG Readiness Gauge component with color tiers in `src/components/shared/ReadinessGauge.tsx`
- [ ] T016 [US1] Implement streamlined Onboarding screen capturing target role and skills without password sign-up in `src/app/onboarding/page.tsx`
- [ ] T017 [US1] Implement Skill Gap Detector report page displaying score, matched badges, and High/Medium/Low missing skill cards in `src/app/gap-detector/page.tsx`
- [ ] T018 [US1] Implement guest session synchronization API route and browser localStorage helper in `src/app/api/session/route.ts` and `src/lib/storage/session.ts`

**Checkpoint**: At this point, the core hero feature and onboarding flow are 100% operational as a viable MVP!

---

## Phase 3: Personal Learning Plan (US2)

**Goal**: Transform diagnostic skill gaps into an actionable week-by-week curriculum (2/4/8 weeks, default 4) with practice tasks, mini-projects, free resources, and interactive checkboxes that dynamically increase the readiness score.

**Independent Test**: Click "Generate Learning Plan" from a gap report, toggle task checkboxes, and verify the progress bar updates and increments the composite readiness score.

- [ ] T019 [P] [US2] Create Zod validation schema for weekly curriculum, tasks, and resources in `src/lib/schemas/learning-plan.schema.ts`
- [ ] T020 [P] [US2] Create AI prompt template for personalized 2/4/8-week milestone curriculum in `src/lib/ai/prompts/learning-plan.prompt.ts`
- [ ] T021 [US2] Implement POST route handler for learning plan generation and task persistence in `src/app/api/learning-plan/route.ts`
- [ ] T022 [P] [US2] Implement interactive week-by-week timeline component with task checkboxes, resource links, and mini-project cards in `src/components/features/LearningRoadmapView.tsx`
- [ ] T023 [US2] Implement Personal Learning Plan page with duration selector (2, 4, 8 weeks), progress bar, and dynamic score recalculation in `src/app/learning-plan/page.tsx`

**Checkpoint**: Users can now diagnose gaps and generate a step-by-step roadmap to close them.

---

## Phase 4: Target-Role Resume Checker (US4)

**Goal**: Enable job seekers to evaluate resume text against their target role, generating an ATS match score, strengths, weaknesses, missing keywords, and exactly 5 rewritten bullet points with before/after comparisons.

**Independent Test**: Navigate to `/resume-checker`, paste resume text for a selected role, click Evaluate, and verify ATS score, keywords, and 5 rewritten bullets appear in under 45 seconds.

- [ ] T024 [P] [US4] Create Zod validation schema for resume ATS analysis and exactly 5 bullet rewrites in `src/lib/schemas/resume-checker.schema.ts`
- [ ] T025 [P] [US4] Create AI prompt template for technical resume evaluation and XYZ-formula rewrites in `src/lib/ai/prompts/resume-checker.prompt.ts`
- [ ] T026 [US4] Implement POST route handler for resume analysis with database caching in `src/app/api/resume-checker/route.ts`
- [ ] T027 [P] [US4] Implement before/after bullet rewrite comparison card with copy-to-clipboard functionality in `src/components/features/ResumeReviewView.tsx`
- [ ] T028 [US4] Implement Resume Checker page with text area, sample text filler, ATS gauge, and keyword pills in `src/app/resume-checker/page.tsx`

---

## Phase 5: AI Mock Interview Practice (US5)

**Goal**: Deliver an interactive 5-question mock interview flow (technical + behavioral) presenting one question at a time, scoring answers 1–10 with constructive feedback and sample answers, concluding in a summary report.

**Independent Test**: Start an interview, answer Question 1, verify instant score/feedback/sample answer and progression to Question 2, complete 5 questions, and verify final summary report.

- [ ] T029 [P] [US5] Create Zod validation schemas for interview question generation, answer evaluation, and summary in `src/lib/schemas/interview.schema.ts`
- [ ] T030 [P] [US5] Create AI prompt templates for role-specific interview questioning and 1–10 scoring in `src/lib/ai/prompts/interview.prompt.ts`
- [ ] T031 [US5] Implement POST route handler for interview start, answer evaluation, and summary generation in `src/app/api/interview/route.ts`
- [ ] T032 [P] [US5] Implement interactive interview question runner with textarea input, timer, and score cards in `src/components/features/InterviewSessionView.tsx`
- [ ] T033 [US5] Implement Mock Interview page with 5-step progress indicator and final performance summary report in `src/app/interviews/page.tsx`

---

## Phase 6: Job Matches & Central Dashboard (US6 & US3)

**Goal**: Match user skills against 30–50 curated entry-level jobs with percentage badges and unify all 5 features under a central dashboard displaying composite readiness, learning progress, and next recommended actions.

**Independent Test**: Navigate to `/job-matches` and see ranked roles with match percentages; navigate to `/dashboard` and verify all 5 feature cards and the next recommended action card display accurately.

- [ ] T034 [P] [US6] Implement GET route handler for deterministic skill matching against seed jobs in `src/app/api/jobs/route.ts`
- [ ] T035 [P] [US6] Implement Job Match listing card displaying match percentage, matched skills, and missing skill badges in `src/components/features/JobMatchesView.tsx`
- [ ] T036 [US6] Implement Job Matches explorer page with category and role filtering in `src/app/job-matches/page.tsx`
- [ ] T037 [US3] Implement Central Dashboard page with composite readiness score, learning plan progress, next recommended action, and 5 tool access cards in `src/app/dashboard/page.tsx`

---

## Phase 7: Polish, Error States, Documentation & Vercel Deployment

**Purpose**: Ensure rock-solid resilience, accessible mobile-first responsiveness, documentation, and live public deployment.

- [ ] T038 [P] Implement global error boundaries, loading skeletons, and empty state illustrations in `src/app/error.tsx` and `src/components/shared/EmptyState.tsx`
- [ ] T039 [P] Audit and test mobile responsiveness across 375px–768px viewports with Tailwind classes
- [ ] T040 [P] Verify fault isolation: simulate artificial AI failures and verify non-blocking graceful degradation in `src/components/shared/ErrorAlert.tsx`
- [ ] T041 Complete comprehensive project documentation, architecture diagram, and Windows PowerShell setup guide in `README.md`
- [ ] T042 Run quickstart manual verification scenarios (all 5 under 60 seconds) per `specs/001-skill-gap-platform/quickstart.md`
- [ ] T043 Configure Vercel deployment configuration (`vercel.json` / build scripts) and deploy to live working URL

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup & Foundation)**: No dependencies — starts immediately.
- **Phase 2 (Skill Gap Detector & Onboarding - US1 & US3)**: Depends on Phase 1 completion. **Blocks all subsequent story phases**.
- **Phase 3 (Learning Plan - US2)**: Depends on Phase 2 (uses identified skill gaps).
- **Phase 4 (Resume Checker - US4)**: Depends on Phase 2 (uses target role context). Can run in parallel with Phase 3.
- **Phase 5 (AI Interviews - US5)**: Depends on Phase 2 (uses target role context). Can run in parallel with Phase 3/4.
- **Phase 6 (Job Matches & Dashboard - US6 & US3)**: Depends on Phase 2 (uses user skill profile).
- **Phase 7 (Polish & Deployment)**: Depends on completion of desired feature phases.

### Parallel Opportunities ([P] Tasks)
- **Within Phase 1**: T002, T003, T004, T005, T006, T007, T009 can all be implemented in parallel.
- **Within Phase 2**: T011, T012, T014, T015 can be built in parallel before route and page assembly.
- **Within Phase 3**: T019, T020, T022 can be built in parallel.
- **Within Phase 4**: T024, T025, T027 can be built in parallel.
- **Within Phase 5**: T029, T030, T032 can be built in parallel.
- **Within Phase 6**: T034, T035 can be built in parallel.
- **Within Phase 7**: T038, T039, T040 can be audited in parallel.

---

## Implementation Strategy & MVP Scope

1. **MVP Scope (End of Phase 2)**:
   - Complete Phase 1 and Phase 2.
   - User goes from Landing Page -> Onboarding -> Skill Gap Detector report in < 2 minutes.
   - Delivers immediate core value: students see exactly what skills they are missing for their dream role.
2. **Incremental Delivery (Phases 3–6)**:
   - Phase 3 adds immediate action (Learning Plan).
   - Phase 4 adds tactical tool (Resume Checker).
   - Phase 5 adds practice tool (AI Interviews).
   - Phase 6 adds market discovery (Job Matches) and unifies the experience (Dashboard).
3. **Production Release (Phase 7)**:
   - Full test run against `quickstart.md`.
   - Vercel live URL deployment.
