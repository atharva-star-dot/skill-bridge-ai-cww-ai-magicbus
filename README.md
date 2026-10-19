# Skill Bridge AI

Skill Bridge AI helps authenticated users compare their skills with a target role, review resume content, build learning plans, and practice interview questions. It is built with Next.js 14 App Router, TypeScript, Prisma, Supabase Auth and Postgres, and optional Gemini AI.

## Architecture

- **Authentication:** Supabase Auth. Application data is associated with the authenticated user's profile; this is not a guest/localStorage authentication flow.
- **Database:** Supabase Postgres, accessed at runtime through Prisma.
- **Schema source of truth:** SQL files in `supabase/`. `prisma/schema.prisma` mirrors that schema for Prisma Client generation and validation; Prisma migrations are not used.
- **AI:** Gemini-backed routes use bounded requests, configured model fallbacks, deterministic fallbacks, and per-user database-backed quotas. AI endpoints allow 20 calls per user per rolling hour by default.
- **Transient browser state:** Resume text awaiting gap analysis may be held in `sessionStorage` for the current browser session. Interview and user data are stored server-side.

## Requirements

- Node.js 20 or later
- npm
- A Supabase project for Auth and Postgres
- A Gemini API key for Gemini-powered responses (optional; deterministic fallbacks are available)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values from your Supabase and Google AI projects. Keep `.env.local` private and out of version control.

   - `DATABASE_URL` should use the Supabase transaction pooler on port `6543`, with `pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL` should use the direct database connection on port `5432`.
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public client configuration.
   - `SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it to browser code or give it a `NEXT_PUBLIC_` prefix.
   - `GEMINI_FALLBACK_MODELS` is an optional comma-separated list of verified model IDs.
   - `TEST_EMAIL_DOMAIN` is required by the test-session cleanup script and should be a domain reserved for test accounts.

3. Set up the database schema in Supabase:

   - For a new database, review and run `supabase/00_RUN_ALL.sql` in the Supabase SQL Editor.
   - For an existing database, review `supabase/04_hardening.sql` and apply it through the SQL Editor. Test it against a disposable/development Supabase project before applying it to production. It includes data backfill and constraint changes; do not assume it has been applied automatically.

   The SQL scripts are designed to be rerunnable. Do not use `prisma migrate` to manage this database.

4. Generate Prisma Client, then start the development server:

   ```bash
   npx prisma generate
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). Sign up or sign in through Supabase Auth.

## Environment variables

See [.env.example](./.env.example) for the complete variable list and safe placeholders. The key variables are:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase pooled Postgres connection used by the app |
| `DIRECT_URL` | Direct Postgres connection used by Prisma tooling |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used for Auth Admin operations, including account deletion |
| `GEMINI_API_KEY` | Optional Gemini API credential |
| `GEMINI_MODEL` | Primary Gemini model ID |
| `GEMINI_FALLBACK_MODELS` | Optional comma-separated backup model IDs |
| `TEST_EMAIL_DOMAIN` | Exact email domain allowed by the cleanup script |

Supabase configuration is required in production; the app does not silently substitute placeholder project credentials. Never commit real credentials.

## Database and data handling

- `supabase/00_RUN_ALL.sql` is the ordered SQL entry point; individual schema, policy, seed, and hardening scripts live in `supabase/`.
- `prisma/schema.prisma` must remain in sync with the SQL schema. Use `npx prisma validate` and `npx prisma generate` to check the Prisma representation.
- Do not use Prisma migrations or `prisma db push` against Supabase; update the SQL source-of-truth scripts and the Prisma schema together.
- `DELETE /api/my-data` removes the authenticated user's application data and Supabase Auth account. It requires the server-only service-role key and must not report success if either deletion step fails.
- Resume review and interview records are associated with the authenticated profile. Do not log resume text, interview answers, or raw errors containing user data.

## Useful commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npx prisma validate
npx prisma generate
npx vitest run
npm run build
```

Remove test profiles only after configuring `TEST_EMAIL_DOMAIN` to an exact test-only domain:

```bash
npx tsx scripts/cleanup-test-sessions.ts
```

The cleanup script is destructive for matching accounts. Inspect the configured domain and target environment before running it.

## Project layout

```text
src/
  app/                 App Router pages and API route handlers
  components/          Shared UI and feature components
  data/                Static role and skill data
  lib/
    ai/                Gemini integration, prompts, quotas, and fallbacks
    scoring/           Shared readiness calculation and skill matching
    supabase/          Supabase client configuration
prisma/
  schema.prisma        Prisma Client data model mirror
scripts/               Database seed and test-account cleanup scripts
specs/                 Feature specifications, contracts, and plans
supabase/               SQL schema source of truth and setup scripts
```

## Deployment

Configure the required environment variables in the deployment environment, including `DATABASE_URL`, `DIRECT_URL`, Supabase public configuration, and the server-only service-role key. Add Gemini configuration if Gemini responses are desired. Apply and verify the SQL scripts in a development Supabase project before deploying schema changes to production.

The AI request deadline is bounded to fit within the application's 30-second route limit. Per-user AI quota enforcement and interview-session limits use Postgres; the hardening SQL must be applied before those database-backed controls can operate.
