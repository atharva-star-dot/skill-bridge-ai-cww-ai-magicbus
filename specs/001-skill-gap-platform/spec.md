# Feature Specification: Skill Bridge AI Platform

**Feature Branch**: `001-skill-gap-platform`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Build 'Skill Bridge AI', a web app that helps college students and job seekers find which skills they are missing for the jobs they want, then helps them close the gap. PROBLEM: Students don't know which skills they need for jobs. USERS: College students and job seekers (mostly in India, fresher to early-career). CORE FEATURES (priority order): 1. Skill Gap Detector (hero feature), 2. Personal Learning Plan, 3. Resume Checker, 4. AI Interviews, 5. Job Matches. USER FLOW: Landing page -> onboarding -> dashboard with 5 feature cards -> feature pages. NON-GOALS: payments, recruiter portal, social features, complex auth. SUCCESS CRITERIA: A new user goes from landing page to a skill gap report in under 2 minutes, and from the report to a learning plan in one click."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Skill Gap Detection & Visual Report (Priority: P1)

As a college student or fresher job seeker, I want to select my desired job role and submit my current skills or resume text so that I can see exactly what skills I am missing, how ready I am for the role, and which skills I must prioritize learning first.

**Why this priority**: This is the core hero feature. Without identifying the precise gap between a student's current competencies and market expectations, none of the subsequent remediation tools (learning plan, resume tuning, mock interviews) can function with context.

**Independent Test**: Can be tested independently by navigating directly to the Gap Detector, entering a role (e.g., "Junior Frontend Developer") and skills (e.g., "HTML, CSS, JavaScript"), and verifying that the system calculates a 0-100 readiness score and categorizes missing skills (High/Medium/Low priority) with explanations in under 60 seconds.

**Acceptance Scenarios**:

1. **Given** a user selects or types a target role and enters a list of current skills, **When** they request gap analysis, **Then** the system displays a readiness score out of 100, lists required role competencies, highlights matched skills, and lists missing skills ranked by High, Medium, and Low impact with clear justification.
2. **Given** a user pastes raw resume text instead of entering individual skill tags, **When** the analysis runs, **Then** the system extracts skills from the text, benchmarks them against the selected target role, and renders the visual comparison report.
3. **Given** a generated gap report, **When** the user views missing skills, **Then** each missing skill includes a succinct explanation of why the skill is critical for fresher or early-career hiring in that role.

---

### User Story 2 - Personalized Week-by-Week Learning Plan (Priority: P2)

As a learner with identified skill gaps, I want to generate a customized week-by-week learning roadmap with topics, practice tasks, a mini project, and free learning resources so that I have a clear, step-by-step path to close my skill deficiencies.

**Why this priority**: Identifying a gap without providing an actionable pathway leaves students overwhelmed. The learning plan turns diagnostic insights into immediate daily/weekly action.

**Independent Test**: Can be tested independently by generating a plan from an existing gap report or preset gap list, switching between 2, 4, and 8-week durations, ticking off a practice task, and confirming the overall plan completion and readiness score increase.

**Acceptance Scenarios**:

1. **Given** an existing skill gap report, **When** the user clicks "Generate Learning Plan", **Then** the system produces a structured week-by-week roadmap defaulted to 4 weeks (with 2-week and 8-week options selectable) addressing the highest-priority missing skills.
2. **Given** a week's curriculum in the plan, **When** viewed, **Then** it contains specific conceptual topics, hands-on practice tasks, links or references to free curated learning resources, and a milestone mini-project.
3. **Given** an active learning plan, **When** the user checks off completed practice tasks, **Then** the overall completion percentage recalculates immediately and increments the user's estimated role readiness score.

---

### User Story 3 - Onboarding Journey & Central Dashboard (Priority: P3)

As a first-time or returning user, I want a frictionless onboarding experience and an overview dashboard displaying my overall readiness score, learning progress, and next recommended actions so that I always know what step to take next.

**Why this priority**: Connects all 5 core tools into a unified user journey. It allows users to start immediately without complex authentication and provides navigation across all features.

**Independent Test**: Can be tested by starting at the landing page, clicking "Get Started", selecting a target role and entering initial skills during onboarding, landing on the dashboard, and verifying all 5 feature cards and the next recommended action card are displayed accurately.

**Acceptance Scenarios**:

1. **Given** a visitor lands on the homepage, **When** they begin onboarding, **Then** they can choose a target role and input their starting skills in a single streamlined screen without mandatory password registration (guest session).
2. **Given** completed onboarding, **When** the user reaches the dashboard, **Then** the dashboard displays the composite readiness score, active learning plan progress, a prominent "Next Recommended Action" card, and access cards for all 5 core tools.
3. **Given** a user returns to the application in the same browser session, **When** they visit the dashboard, **Then** their previous role selection, gap evaluation, and task progress remain intact.

---

### User Story 4 - Target-Role Resume Checker & ATS Feedback (Priority: P4)

As a job seeker applying for junior roles, I want to compare my resume against my target role so that I can see my ATS compatibility score, identified strengths and weaknesses, missing keywords, and concrete bullet point improvements.

**Why this priority**: Freshers frequently struggle with resume screening algorithms and weak bullet phrasing. Providing immediate rewrites dramatically improves application conversion.

**Independent Test**: Can be tested by pasting resume text, selecting a target role, submitting for analysis, and verifying that an ATS match score, keyword gap list, and exactly 5 rewritten bullet points with before/after comparisons are generated.

**Acceptance Scenarios**:

1. **Given** a user pastes their resume text and selects a target job title, **When** they run the Resume Checker, **Then** the system outputs an estimated ATS match score (0-100), key strengths, and specific weaknesses.
2. **Given** the resume analysis output, **When** reviewing keyword optimization, **Then** missing technical and industry-standard keywords critical for that role are highlighted.
3. **Given** the resume analysis output, **When** reviewing bullet point recommendations, **Then** the system provides at least 5 actionable bullet point revisions demonstrating action verbs and measurable impact tailored to fresher candidates.

---

### User Story 5 - AI Mock Interview Practice (Priority: P5)

As an aspiring candidate preparing for interviews, I want to practice answering role-specific technical and behavioral questions one by one and receive immediate scoring and sample answer coaching.

**Why this priority**: Interview anxiety is a primary barrier for freshers in India. Interactive mock questions build practical confidence after skills are acquired.

**Independent Test**: Can be tested by starting an interview session for a chosen role, answering 5 sequential questions via text, receiving 1-10 scores and critique after each answer, and viewing a final performance summary report.

**Acceptance Scenarios**:

1. **Given** a user initiates an interview session for their target role, **When** the session begins, **Then** the system presents 5 sequential questions (balanced between technical foundations and situational/behavioral scenarios), delivered one at a time.
2. **Given** a question is displayed, **When** the user inputs their text answer and submits, **Then** the system scores the response from 1 to 10, provides constructive feedback, and shows an improved model answer before unlocking the next question.
3. **Given** all 5 questions have been submitted, **When** the interview concludes, **Then** the system presents a comprehensive summary report highlighting key strengths, improvement areas, and an overall interview performance rating.

---

### User Story 6 - Curated Job Role Matching & Opportunity Explorer (Priority: P6)

As a job seeker with an existing skill profile, I want to explore which entry-level roles match my current capabilities so that I can discover alternative or immediate job opportunities.

**Why this priority**: Students often fixate on one rigid title without realizing their existing skills qualify them for related high-demand junior positions.

**Independent Test**: Can be tested by navigating to Job Matches with an active skill profile and verifying that 30-50 curated entry-level roles are filtered and ranked by match percentage with missing skill tags displayed.

**Acceptance Scenarios**:

1. **Given** a user with identified skills, **When** they view the Job Matches page, **Then** the system ranks curated entry-level roles from a verified seed dataset (30-50 roles) by percentage match.
2. **Given** a listed job match card, **When** inspected, **Then** the card displays the match percentage, required skills that the user already possesses, and key missing skills needed to qualify.
3. **Given** a user clicks on an alternative job match, **When** selected, **Then** they have the option to set it as their new target role or run an instant gap analysis against it.

---

### Edge Cases

- **Empty or Gibberish Input**: How does the system handle nonsensical text, single-character inputs, or irrelevant pasted content in the skill or resume fields?
  - *Behavior*: Validates input length and clarity before analysis; displays a friendly prompt explaining that recognizable skills or standard resume sections are required.
- **Extreme Mismatch (0% or 100% Readiness)**: How does the system respond when a fresher enters skills completely unrelated to the role (0% match) or inputs every conceivable skill (100% match)?
  - *Behavior*: For 0% matches, avoids demoralizing language, identifies the foundational starting points, and provides a gentle on-ramp learning plan. For 100% matches, highlights advanced/niche differentiators and recommends interview practice.
- **Network or AI Evaluation Interruption**: How does the application behave if an evaluation request experiences a timeout or temporary provider error?
  - *Behavior*: Displays a clear, retryable error message preserving the user's entered text; never crashes or blocks navigation to other dashboard features.
- **Mid-Interview Abandonment**: What happens if a user navigates away after answering 2 out of 5 interview questions?
  - *Behavior*: Preserves current progress within the local session so the user can resume or restart without losing answered feedback.
- **Custom / Unrecognized Target Role**: What happens if a user enters an emerging or non-standard job title not present in the preset suggestions?
  - *Behavior*: Accepts custom role text, dynamically identifies standard industry competencies for that title, and executes gap analysis normally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to select common entry-level roles from predefined suggestions or enter a custom target job title.
- **FR-002**: The system MUST support two skill entry modes: manual input (individual tags or free-text descriptions) and direct resume text pasting.
- **FR-003**: The system MUST extract competencies from inputs and calculate a quantitative Role Readiness Score (0-100).
- **FR-004**: The system MUST categorize missing skills into three explicit priority tiers: High Impact, Medium Impact, and Low Impact, with an accompanying rationale for each.
- **FR-005**: The system MUST generate a personalized, week-by-week learning roadmap with configurable duration options (2 weeks, 4 weeks, 8 weeks), defaulting to 4 weeks.
- **FR-006**: Each learning plan week MUST contain specific learning topics, concrete practice tasks, links/names of free public learning resources, and a mini-project milestone.
- **FR-007**: The system MUST allow users to toggle tasks as completed, dynamically updating plan progress and incrementing the readiness score.
- **FR-008**: The system MUST analyze pasted resume text against the selected target role to generate an ATS compatibility score, strengths, weaknesses, missing keywords, and exactly 5 rewritten bullet points.
- **FR-009**: The system MUST conduct a 5-question interview practice flow presenting one question at a time (combining technical and behavioral prompts).
- **FR-010**: The system MUST evaluate each interview response with a 1-10 numerical score, constructive critique, and an exemplary model answer before proceeding to the subsequent question.
- **FR-011**: The system MUST generate an interview summary report upon completion of all 5 questions.
- **FR-012**: The system MUST compare user skills against a curated seed catalog of 30 to 50 entry-level roles and compute a match percentage for each without web scraping.
- **FR-013**: The system MUST provide an onboarding flow that collects target role and skill inputs before directing the user to the central dashboard.
- **FR-014**: The central dashboard MUST display the user's readiness score, learning plan progress indicator, a next recommended action, and quick-access navigation to all 5 features.
- **FR-015**: The system MUST maintain user state across sessions using lightweight client or guest session persistence without requiring complex authentication or mandatory passwords.
- **FR-016**: The system MUST isolate all feature modules so that an error in one feature (e.g., Resume Checker) does not impede or degrade any other feature (e.g., Gap Detector or Learning Plan).
- **FR-017**: All visual interfaces MUST render responsive mobile-first layouts with explicit loading, empty, and error feedback states.

### Key Entities *(include if feature involves data)*

- **Session**: Represents the active anonymous or guest learner; stores `targetRoleId`, `targetRoleTitle`, `currentSkills`, `readinessScore`, and session timestamps in browser storage and database.
- **TargetRole**: Represents the curated benchmark role (e.g. Junior Frontend Developer) with `requiredSkills` and `goodToHaveSkills`.
- **SkillGapReport**: Represents the diagnostic evaluation; includes `targetRole`, `matchedSkills`, prioritized `missingSkills` (High/Medium/Low with rationale), `readinessScore` (0-100), and summary.
- **LearningPlan**: Represents the roadmap; contains `targetRole`, `durationWeeks` (2, 4, or 8), and `completionPercentage`.
- **PlanTask**: Represents a granular weekly task with `weekNumber`, `title`, `description`, `estimatedHours`, free resource references, and `isCompleted` toggle.
- **ResumeReview**: Represents resume diagnostics; contains input resume text, `atsScore` (0-100), `strengths`, `weaknesses`, `missingKeywords`, and exactly 5 `bulletRewrites`.
- **InterviewSession**: Represents an interactive mock interview; contains `targetRole`, `status` ("in_progress" | "completed"), `currentQuestionIndex`, and final summary assessment.
- **InterviewAnswer**: Represents an individual interview response transcript; contains `questionIndex` (0-4), `questionType`, `questionText`, `userAnswer`, `score` (1-10), `feedback`, and `sampleAnswer`.
- **JobRole**: Represents curated entry-level jobs in the seed catalog; contains `title`, `company`, `location`, `experienceLevel`, `salaryRange`, required `skills`, and `applyUrl`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can progress from the landing page through onboarding to a complete, visualized skill gap report in under 2 minutes.
- **SC-002**: A user can transition from a completed skill gap report to a generated personal learning plan in exactly one click.
- **SC-003**: 100% of generated gap reports categorize missing skills into High, Medium, and Low priorities with clear explanations.
- **SC-004**: 100% of resume evaluations deliver exactly 5 actionable bullet point revisions with clear before-and-after contrasts.
- **SC-005**: All primary user flows and individual story acceptance criteria can be manually verified by a reviewer in under 60 seconds each.
- **SC-006**: Users on mobile viewports (e.g., 375px width) can complete onboarding, view gap charts, and check off learning plan tasks without horizontal scrolling or broken layouts.
- **SC-007**: When an artificial failure is simulated on any single feature (such as the Interview Simulator), all remaining dashboard features continue to load and operate without disruption.

## Assumptions

- **Target Audience Profile**: Primarily fresher college students and early-career job seekers in India preparing for software engineering, web development, data, or product entry-level roles.
- **Data Source for Jobs**: A statically curated, realistic seed dataset of 30-50 standard fresher/entry-level roles will be bundled with the application; external job scraping and live job board APIs are excluded.
- **Authentication Scope**: Guest-first session management (stored via browser storage or lightweight cookie session) is sufficient for MVP; no mandatory password sign-ups or social OAuth required.
- **Resource Recommendations**: Recommended learning materials focus on established, high-quality free resources (e.g., MDN, official documentation, free interactive tracks, reputable open tutorials).
- **Language**: English is the primary language for all UI elements, skill assessments, and AI evaluations.
- **Browser Compatibility**: Fully functional on modern mobile and desktop browsers (Chrome, Edge, Safari, Firefox).
