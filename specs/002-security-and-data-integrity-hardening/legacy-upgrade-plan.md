# Legacy text-schema upgrade plan

This plan upgrades the legacy Supabase application tables to the schema represented by `supabase/01_schema.sql`, `supabase/04_hardening.sql`, and `supabase/05_rls_policies.sql`. The migration is `supabase/06_upgrade_legacy_text_schema.sql`. It is intentionally not appended to `00_RUN_ALL.sql`: it is an in-place conversion for an existing legacy database, not part of new-database setup.

## Before scheduling the upgrade

1. Take a Supabase backup and confirm that its restore procedure is available. Do not proceed without a restorable backup.
2. Run the read-only preflight SQL below using the Supabase SQL Editor. Save the results securely with the change record; do not paste database credentials or user content into tickets.
3. Resolve every invalid UUID, missing Auth profile, duplicate answer key, and invalid timestamp reported by preflight. Do not have the migration guess how to repair or discard records.
4. Review `supabase/06_upgrade_legacy_text_schema.sql` and rehearse it against a restored backup or isolated clone. The CI integration test uses a fresh disposable PostgreSQL database and does not connect to Supabase.
5. Schedule an appropriate maintenance window. The migration takes an exclusive lock while changing column types and rebuilding dependent indexes/constraints; runtime requests may block until commit.
6. Apply the reviewed SQL once in the Supabase SQL Editor. The script wraps all DDL in one transaction; a guard or DDL failure rolls the transaction back.
7. Run `npx tsx scripts/verify-supabase.ts` using the direct connection and review every SC-tagged check. Then run authenticated smoke checks for sign-in, data reads/writes, interview answers, account deletion, and AI quota behavior.

## Read-only preflight queries

Run these against the legacy database before applying the migration. Counts include all application tables; `target_roles` and `job_roles` are global reference tables.

### Row counts

```sql
SELECT 'profiles' AS table_name, count(*) AS row_count FROM public.profiles
UNION ALL SELECT 'target_roles', count(*) FROM public.target_roles
UNION ALL SELECT 'skill_gap_reports', count(*) FROM public.skill_gap_reports
UNION ALL SELECT 'learning_plans', count(*) FROM public.learning_plans
UNION ALL SELECT 'plan_tasks', count(*) FROM public.plan_tasks
UNION ALL SELECT 'resume_reviews', count(*) FROM public.resume_reviews
UNION ALL SELECT 'interview_sessions', count(*) FROM public.interview_sessions
UNION ALL SELECT 'interview_answers', count(*) FROM public.interview_answers
UNION ALL SELECT 'job_roles', count(*) FROM public.job_roles
ORDER BY table_name;
```

### IDs and foreign keys that are not UUIDs

This reports non-UUID values and nulls in every legacy ID/foreign-key column that will be converted.

```sql
WITH values_to_check(table_name, column_name, value) AS (
  SELECT 'profiles', 'id', id FROM public.profiles
  UNION ALL SELECT 'skill_gap_reports', 'id', id FROM public.skill_gap_reports
  UNION ALL SELECT 'skill_gap_reports', 'user_id', user_id FROM public.skill_gap_reports
  UNION ALL SELECT 'learning_plans', 'id', id FROM public.learning_plans
  UNION ALL SELECT 'learning_plans', 'user_id', user_id FROM public.learning_plans
  UNION ALL SELECT 'plan_tasks', 'id', id FROM public.plan_tasks
  UNION ALL SELECT 'plan_tasks', 'plan_id', plan_id FROM public.plan_tasks
  UNION ALL SELECT 'resume_reviews', 'id', id FROM public.resume_reviews
  UNION ALL SELECT 'resume_reviews', 'user_id', user_id FROM public.resume_reviews
  UNION ALL SELECT 'interview_sessions', 'id', id FROM public.interview_sessions
  UNION ALL SELECT 'interview_sessions', 'user_id', user_id FROM public.interview_sessions
  UNION ALL SELECT 'interview_answers', 'id', id FROM public.interview_answers
  UNION ALL SELECT 'interview_answers', 'interview_session_id', interview_session_id
    FROM public.interview_answers
  UNION ALL SELECT 'job_roles', 'id', id FROM public.job_roles
  UNION ALL SELECT 'target_roles', 'id', id FROM public.target_roles
)
SELECT table_name, column_name, value
FROM values_to_check
WHERE value IS NULL
   OR value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY table_name, column_name;
```

### Profiles without a matching Auth user

```sql
SELECT profile.id
FROM public.profiles AS profile
LEFT JOIN auth.users AS auth_user ON auth_user.id::text = profile.id
WHERE auth_user.id IS NULL;
```

### Unparsable or null timestamps

`pg_input_is_valid` validates text without raising for malformed values; the query is read-only.

```sql
SELECT 'profiles.created_at' AS column_name, created_at AS value
FROM public.profiles
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone')
UNION ALL
SELECT 'profiles.updated_at', updated_at
FROM public.profiles
WHERE updated_at IS NULL OR NOT pg_input_is_valid(updated_at, 'timestamp with time zone')
UNION ALL
SELECT 'skill_gap_reports.created_at', created_at
FROM public.skill_gap_reports
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone')
UNION ALL
SELECT 'learning_plans.created_at', created_at
FROM public.learning_plans
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone')
UNION ALL
SELECT 'resume_reviews.created_at', created_at
FROM public.resume_reviews
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone')
UNION ALL
SELECT 'interview_sessions.created_at', created_at
FROM public.interview_sessions
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone')
UNION ALL
SELECT 'interview_answers.created_at', created_at
FROM public.interview_answers
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone')
UNION ALL
SELECT 'target_roles.created_at', created_at
FROM public.target_roles
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone')
UNION ALL
SELECT 'job_roles.created_at', created_at
FROM public.job_roles
WHERE created_at IS NULL OR NOT pg_input_is_valid(created_at, 'timestamp with time zone');
```

### Duplicate interview answer keys

```sql
SELECT interview_session_id, question_index, count(*) AS duplicate_count
FROM public.interview_answers
GROUP BY interview_session_id, question_index
HAVING count(*) > 1;
```

### Existing triggers, policies, indexes, constraints, and functions

```sql
SELECT trigger_row.tgname AS trigger_name,
       table_schema.nspname AS schema_name,
       table_row.relname AS table_name,
       pg_get_triggerdef(trigger_row.oid) AS definition
FROM pg_trigger AS trigger_row
JOIN pg_class AS table_row ON table_row.oid = trigger_row.tgrelid
JOIN pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
WHERE NOT trigger_row.tgisinternal
  AND table_schema.nspname IN ('auth', 'public')
ORDER BY schema_name, table_name, trigger_name;

SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT table_schema.nspname AS schema_name,
       table_row.relname AS table_name,
       index_row.relname AS index_name,
       pg_get_indexdef(index_row.oid) AS definition
FROM pg_index AS index_meta
JOIN pg_class AS table_row ON table_row.oid = index_meta.indrelid
JOIN pg_class AS index_row ON index_row.oid = index_meta.indexrelid
JOIN pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
WHERE table_schema.nspname = 'public'
ORDER BY table_name, index_name;

SELECT constraint_row.conrelid::regclass AS table_name,
       constraint_row.conname AS constraint_name,
       pg_get_constraintdef(constraint_row.oid) AS definition
FROM pg_constraint AS constraint_row
WHERE constraint_row.connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;

SELECT routine_schema, routine_name, specific_name,
       routine_type, data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name, specific_name;
```

Also record values outside the expected boolean domain before conversion:

```sql
SELECT is_completed, count(*) AS row_count
FROM public.plan_tasks
GROUP BY is_completed
ORDER BY is_completed;
```

Only values `0` and `1` are accepted by the migration.

## Risks

- The migration holds locks and converts primary keys, foreign keys, and timestamp columns. Large tables may require a long maintenance window.
- UUID conversion is exact and rejects malformed or non-canonical UUID strings; the migration intentionally aborts rather than coercing identifiers.
- Timestamp strings are interpreted using the PostgreSQL session timezone when no timezone is present. Set the SQL Editor session timezone to the intended legacy interpretation and verify it with preflight samples before migration.
- Integer task completion values other than 0 or 1 are rejected to avoid silently mapping unknown states to `true`.
- The migration restores expected application indexes, cascading FKs, Auth trigger, RLS enablement, privileges, and owner policies. Existing custom policies are not removed; review preflight output for policies that would conflict with the expected security model.
- Unique interview-answer enforcement fails safely if duplicates appear after preflight or if an existing index name has an incompatible definition.

## Rollback

The migration transaction automatically rolls back if any guard or DDL statement fails before commit. If it commits but post-upgrade verification or application smoke tests fail, stop application writes and **restore the pre-migration Supabase backup**. Do not attempt an inverse type-conversion script: UUID/timestamp/boolean conversions may not be safely reversible to the exact original text representation, and the migration is designed to preserve forward data rather than reconstruct prior formatting.

## Completion record

- Backup identifier / restore point: ______________________________
- Preflight reviewed by / date: __________________________________
- Migration result / date: ______________________________________
- Verification output / date: ___________________________________
