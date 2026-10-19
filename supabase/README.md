# Supabase database setup

The SQL files in this directory are the database schema source of truth. `prisma/schema.prisma` mirrors the schema for Prisma Client generation and validation; do not use Prisma migrations or `prisma db push` to manage the Supabase database.

## SQL files and run order

| File | Purpose |
| --- | --- |
| `00_RUN_ALL.sql` | Ordered setup entry point: schema, Auth/security setup, seed data, then hardening |
| `01_schema.sql` | Core application tables and indexes |
| `02_auth_and_security.sql` | Profile/Auth integration, row-level security, and related grants/policies |
| `03_seed.sql` | Static role and job reference data |
| `04_hardening.sql` | Profile backfill, profile-owned cascading foreign keys, interview-answer uniqueness, AI usage quota table, and database functions used for atomic limits |
| `05_rls_policies.sql` | Idempotent read/delete owner policies for user-owned application tables |

For a new database, review and run `00_RUN_ALL.sql` in the Supabase Dashboard SQL Editor. For a database that already has the earlier schema, review `04_hardening.sql` and apply it in the SQL Editor. Test schema changes on a disposable/development project before applying them to production. The migration is designed to be idempotent; data conflicts that prevent safe constraints must surface as errors rather than being silently ignored.

The application does not apply SQL migrations automatically. Applying the hardening migration is required before account-data cascades, AI quotas, and the interview-session limit can work as intended.

`05_rls_policies.sql` is defense in depth: Prisma connects as the table owner and application route handlers still enforce ownership. This file changes policies only; it adds no grants and does not remove the existing table privilege revokes.

## Verify policies and table privileges

List the policies installed by the hardening script:

```sql
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'skill_gap_reports',
    'learning_plans',
    'resume_reviews',
    'interview_sessions',
    'plan_tasks',
    'interview_answers'
  )
ORDER BY tablename, policyname;
```

Confirm `authenticated` has no direct `SELECT` privilege on these tables:

```sql
SELECT table_name,
       has_table_privilege('authenticated', format('public.%I', table_name), 'select') AS authenticated_can_select
FROM (VALUES
  ('skill_gap_reports'),
  ('learning_plans'),
  ('resume_reviews'),
  ('interview_sessions'),
  ('plan_tasks'),
  ('interview_answers')
) AS protected_tables(table_name)
ORDER BY table_name;
```

Every `authenticated_can_select` result should be `false`.

## Verify setup

List the public tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Check row-level security status:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
