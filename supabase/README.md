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

For a new database, review and run `00_RUN_ALL.sql` in the Supabase Dashboard SQL Editor. For a database that already has the earlier schema, review `04_hardening.sql` and apply it in the SQL Editor. Test schema changes on a disposable/development project before applying them to production. The migration is designed to be idempotent; data conflicts that prevent safe constraints must surface as errors rather than being silently ignored.

The application does not apply SQL migrations automatically. Applying the hardening migration is required before account-data cascades, AI quotas, and the interview-session limit can work as intended.

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
