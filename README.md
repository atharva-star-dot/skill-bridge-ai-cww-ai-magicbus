# 🎯 Skill Bridge AI

**An AI-powered career accelerator for Indian freshers and college students.**  
Built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and the Google Gemini API.

---

## ✨ Features

| Feature | Route | Description |
|---|---|---|
| **Skill Gap Detector** | `/gap-detector` | AI-powered 0–100 readiness score and prioritised missing skills |
| **Personal Learning Plan** | `/learning-plan` | Week-by-week curriculum (2 / 4 / 8 weeks) with checkboxes and progress |
| **ATS Resume Checker** | `/resume-checker` | ATS match score, keyword gaps, and 5 XYZ-formula bullet rewrites |
| **AI Mock Interviews** | `/interviews` | 5-question sessions (3 technical + 1 scenario + 1 behavioral) scored 1–10 |
| **Job Matches** | `/job-matches` | 40 curated entry-level roles ranked by skill match % |
| **Dashboard** | `/dashboard` | Unified view of readiness score, plan progress, and latest scores |

All AI features fall back to deterministic logic when no API key is set, so the app never breaks.

---

## 🏗️ Architecture

```
src/
├── app/                     # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── gap-detector/    # POST – skill gap analysis
│   │   ├── health/          # GET  – deployment health check
│   │   ├── interview/       # start · answer · summary · active
│   │   ├── learning-plan/   # POST · saved · task/[taskId]
│   │   ├── resume-checker/  # POST – ATS analysis
│   │   └── session/         # GET  – guest session data
│   ├── dashboard/           # Unified career dashboard
│   ├── gap-detector/        # Skill gap report
│   ├── interviews/          # Mock interview flow
│   ├── job-matches/         # Curated job matches
│   ├── learning-plan/       # Week-by-week roadmap
│   ├── onboarding/          # Role + skills entry
│   └── resume-checker/      # ATS resume evaluation
├── components/
│   ├── features/            # Feature-specific components
│   │   ├── JobMatchesView.tsx
│   │   ├── LearningRoadmapView.tsx
│   │   └── ResumeReviewView.tsx
│   ├── shared/              # Reusable layout + utility components
│   │   ├── EmptyState.tsx
│   │   ├── ErrorAlert.tsx
│   │   ├── Footer.tsx
│   │   ├── Navbar.tsx
│   │   ├── ReadinessGauge.tsx
│   │   └── SkillTagInput.tsx
│   └── ui/                  # shadcn/ui primitives
├── data/
│   ├── seed-jobs.ts         # 40 curated entry-level Indian tech jobs
│   └── seed-roles.ts        # 25 popular fresher roles
├── lib/
│   ├── ai/
│   │   ├── fallbacks/       # Deterministic fallbacks (no API key needed)
│   │   ├── gemini.ts        # Gemini client with retry + 20-second timeout
│   │   └── prompts/         # Prompt templates per feature
│   ├── schemas/             # Zod validation schemas per feature
│   ├── storage/
│   │   └── session.ts       # localStorage session helper
│   └── db.ts                # Prisma client singleton
├── scripts/
│   ├── cleanup-test-sessions.ts  # Delete test-* sessions before production launch
│   └── seed.ts              # Database seeder
└── prisma/
    └── schema.prisma        # Database schema (9 models)
```

---

## 🚀 Quick Start (Windows PowerShell)

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- **Google Gemini API key** (free tier) — [aistudio.google.com](https://aistudio.google.com)

### 1. Clone & install

```powershell
git clone https://github.com/your-org/skill-bridge-ai.git
cd "skill-bridge-ai"
npm install
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and fill in:

```env
# Required: Google Gemini API key
GEMINI_API_KEY=your_key_here

# Optional: Override the default Gemini model
# Defaults to gemini-2.0-flash-exp if not set
GEMINI_MODEL=gemini-2.0-flash-exp

# Required: Database connection string
# For local SQLite development:
DATABASE_URL="file:./dev.db"
# For production Postgres (Neon / Supabase):
# DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

> **Note:** `.env.local` is gitignored and should never be committed.

### 3. Set up the database

```powershell
npx prisma migrate dev --name init
npm run seed
```

### 4. Run the development server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verify the installation

Follow these 5 quick scenarios (each under 60 seconds):

1. **Skill Gap Detector** — Navigate to `/onboarding`, select "Junior Frontend Developer", enter `HTML, CSS, JavaScript, React`, click **Analyze**. Expect a 0–100 score gauge with High/Medium/Low missing skills.

2. **Learning Plan** — From the gap report, click **Build my learning plan**. Expect a 4-week roadmap with task checkboxes. Tick a task and verify the progress bar updates.

3. **Resume Checker** — Navigate to `/resume-checker`, paste any resume text, click **Evaluate Resume**. Expect an ATS score, keyword pills, and 5 bullet rewrites.

4. **Mock Interview** — Navigate to `/interviews`, click **Start Interview**. Answer 5 questions. Expect per-question scores (1–10) and a final summary report.

5. **Job Matches** — Navigate to `/job-matches`. Expect 40 jobs ranked by match %. Filter by location.

### Fallback mode test

Temporarily rename `.env.local` to `.env.local.bak` and restart `npm run dev`. All AI routes should return deterministic responses with `"source": "fallback"`.

---

## 🌐 Deployment (Vercel)

### One-time setup

```powershell
npm install -g vercel
vercel login
```

### Database: Neon (Postgres — free tier)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string.
3. In your Vercel project, add environment variable `DATABASE_URL` with the Neon string.
4. Change `prisma/schema.prisma` provider from `sqlite` to `postgresql`.
5. Run `npx prisma migrate deploy` against the Neon DB before deploying.

### Deploy

```powershell
vercel --prod
```

### Required environment variables (Vercel dashboard → Settings → Environment Variables)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon / Supabase Postgres connection string |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.0-flash-exp` |

### Before first production launch

Run the cleanup script to remove any test sessions from the database:

```powershell
node scripts/cleanup-test-sessions.ts
```

---

## 📐 Database Schema

Nine Prisma models:

- **Session** — guest session (localStorage ID → DB)
- **SkillGapReport** — keyed by `(sessionId, targetRole, skillsHash)` for role-switch isolation
- **LearningPlan** + **PlanTask** — week-by-week curriculum with task completion
- **ResumeReview** — ATS analysis result per session and role
- **InterviewSession** + **InterviewAnswer** — mock interview state and scoring
- **TargetRole** — seeded role metadata
- **JobRole** — seeded job listings (40 curated Indian tech jobs)

---

## 🤖 AI Integration

All AI calls go through `src/lib/ai/gemini.ts`:

- **Retry**: 3 attempts with exponential backoff (600 ms → 1 500 ms → 3 000 ms).
- **Timeout**: 20-second hard cap per call; auto-falls back on timeout.
- **Model cascade**: Primary model → secondary model → `gemini-3.5-flash-lite`.
- **Fallback**: Every feature has a deterministic fallback in `src/lib/ai/fallbacks/`.
- **No API key**: App runs fully in fallback mode.

### Model configuration

Set `GEMINI_MODEL` in `.env.local`. Available options:

```
gemini-2.0-flash-exp     (default, fast + capable)
gemini-1.5-pro           (highest quality, slower)
gemini-1.5-flash         (faster, good quality)
```

---

## 🔒 Security & Privacy

- No user authentication — all sessions are guest sessions keyed by a UUID stored in `localStorage`.
- **API key lives only in server code** — never exposed to the client.
- **Answer and resume text are never logged** — only timing durations are written to console.
- `GEMINI_API_KEY` is validated server-side; the app degrades gracefully without it.

---

## 🧹 Development Scripts

```powershell
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint
npm run seed         # Seed the database with roles and jobs

# Cleanup test sessions (run against production DB before launch)
node scripts/cleanup-test-sessions.ts
```

---

## 📱 Responsive Design

Tested at 375 px (mobile), 768 px (tablet), and 1280 px (desktop). All pages use responsive Tailwind utility classes (`sm:`, `md:`, `lg:` breakpoints).

---

## 🪪 License

MIT © 2026 CWW AI Project
