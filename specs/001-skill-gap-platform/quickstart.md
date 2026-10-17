# Quickstart Validation Guide: Skill Bridge AI Platform

**Feature**: [Skill Bridge AI Platform](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/spec.md)
**Date**: 2026-10-17

---

## 1. Prerequisites & Environment Setup

### Environment Variables
Copy `.env.example` to `.env.local` (Windows PowerShell):
```powershell
Copy-Item .env.example .env.local
```

Ensure `.env.local` contains:
```env
GEMINI_API_KEY=your_gemini_api_key_here
# Optional Supabase config (fallback to client/local state if empty):
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Installation & Run
```powershell
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Fast Manual Verification Scenarios (Under 60s Each)

### Scenario 1: Onboarding to Skill Gap Detection (< 45s)
1. Navigate to `http://localhost:3000/`.
2. Click **Get Started** to enter onboarding.
3. Select **Junior Frontend Developer** from the 25 popular seed roles.
4. Enter skills: `HTML, CSS, JavaScript, React`.
5. Click **Analyze Skill Gap**.
6. **Expected Outcome**:
   - Visual gauge displays readiness score (e.g., ~60–70/100).
   - Matched skills list includes `HTML`, `CSS`, `JavaScript`, `React`.
   - Missing skills include `TypeScript`, `Tailwind CSS`, `Git`, categorized as High, Medium, or Low priority with clear justifications.
   - Ref: [gap-detector.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/contracts/gap-detector.md).

### Scenario 2: One-Click Learning Plan & Progress Recalculation (< 30s)
1. On the completed Gap Detector report, click **Generate Learning Plan**.
2. Select **4 Weeks** (default).
3. View Week 1 topics and practice tasks.
4. Check off the first task checkbox.
5. **Expected Outcome**:
   - Plan progress bar increases from 0% to ~12%.
   - Overall role readiness score dynamically recalculates upwards.
   - Ref: [learning-plan.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/contracts/learning-plan.md).

### Scenario 3: Target-Role Resume Review & Rewrites (< 45s)
1. Navigate to `/resume-checker`.
2. Select target role **Junior Frontend Developer**.
3. Paste sample resume text (from quickstart sample below).
4. Click **Evaluate Resume**.
5. **Expected Outcome**:
   - Shows an ATS match score (0–100).
   - Highlights at least 2 strengths, 2 weaknesses, and missing keywords.
   - Displays exactly 5 concrete bullet point rewrites with before/after comparisons and rationale.
   - Ref: [resume-checker.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/contracts/resume-checker.md).

### Scenario 4: Step-by-Step AI Interview Practice (< 60s)
1. Navigate to `/interviews`.
2. Select target role and click **Start Mock Interview**.
3. Read Question 1 (technical or behavioral), type a 1-sentence answer, and click **Submit Answer**.
4. **Expected Outcome**:
   - Displays score (1–10), constructive critique, and an exemplary sample answer.
   - Unlocks Question 2 of 5.
   - Ref: [interview.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/contracts/interview.md).

### Scenario 5: Curated Job Role Matching (< 15s)
1. Navigate to `/job-matches`.
2. **Expected Outcome**:
   - Immediately displays matched entry-level roles from the 30–50 curated seed catalog.
   - Displays match percentage badges (e.g. 85% Match) and missing skill tags.
   - Ref: [jobs.md](file:///e:/OneMoreTime/projects/CWW%20Ai%20Project/skill-bridge-ai/specs/001-skill-gap-platform/contracts/jobs.md).

---

## 3. Sample Verification Text Snippet

**Pasted Resume Test Sample**:
```text
Final year B.Tech Computer Science student. Built a college event website using HTML, CSS, JavaScript, and React. Created an online store with Node.js and Express with MongoDB. Solved 150+ LeetCode problems in Java. Led technical symposium web team.
```
