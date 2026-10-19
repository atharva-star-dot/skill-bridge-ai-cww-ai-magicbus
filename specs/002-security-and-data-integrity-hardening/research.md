# Research: Security and Data Integrity Hardening

**Feature**: `002-security-and-data-integrity-hardening`
**Date**: 2026-10-20

## Decisions

### Supabase/Postgres connections for Vercel + Prisma 5

**Decision**: Use the Supabase transaction-mode pooler connection string for Prisma Client at runtime in Vercel serverless functions. Configure the pooled URL as `DATABASE_URL` with the required `pgbouncer=true` and `connection_limit=1` parameters. Configure the direct database connection as `DIRECT_URL` for direct maintenance/introspection workflows only. Copy actual connection URLs from the Supabase dashboard rather than deriving pooler hosts or credentials.

**Rationale**:

- Supabase recommends transaction pooling for serverless/edge workloads because these workloads open many short-lived connections.
- Prisma supports separate runtime and direct URLs through datasource `url` and `directUrl`; keeping the direct URL out of Prisma Client runtime avoids bypassing the server-side pooler.
- The small per-instance pool limit reduces multiplication of Prisma connections across horizontally scaled Vercel function instances. Supabase notes both client and backend connection caps apply, and all services share the database's total connection budget.
- The project is fixed to Prisma 5.21 and has no custom driver adapter. Keep `pgbouncer=true` in the pooler URL as explicitly required for the deployed Prisma connection mode, and validate against the exact Supabase pooler URL in the deployment environment.
- The SQL installation path remains `supabase/00_RUN_ALL.sql`; do not use Prisma Migrate. Keep schema declarations mirrored in Prisma and verify drift by comparing the applied SQL schema with `prisma/schema.prisma`.

**Configuration shape**:

```env
DATABASE_URL="postgresql://<pooler-user>:<encoded-password>@<supabase-pooler-host>:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://<direct-user>:<encoded-password>@<direct-db-host>:5432/postgres"
```

Use the precise username and host supplied by Supabase Connect. Percent-encode reserved characters in passwords. Depending on the project's network and IPv4/IPv6 availability, the direct endpoint may not be reachable from a developer network; this does not change the serverless runtime's use of the transaction pooler.

The repository's `vercel.json` already sets `regions: ["bom1"]` and 30-second maximum durations for all six AI routes. Keep this configuration; the provider deadline and deterministic fallback must complete inside that bound.

### Database source of truth and ORM mirror

**Decision**: Idempotent SQL under `supabase/` owns schema changes. `04_hardening.sql` is appended to `00_RUN_ALL.sql`. `prisma/schema.prisma` mirrors every table, mapped column, relation, default, index, and unique key, but Prisma Migrate is not invoked.

**Rationale**: The user's explicit deployment constraint resolves the prior clarification conflict. SQL remains the auditable provisioning and migration artifact; Prisma remains aligned with the runtime data model.

### Concurrency and transaction strategy

**Decision**: Use Prisma `$transaction` for multi-write application changes; use a row lock or transaction-scoped advisory lock keyed to the authenticated user when a cross-request quota or interview-count invariant requires serialization.

**Rationale**: A read-then-write sequence without serialization can admit concurrent calls above the per-user limit. Locking and count/insert must happen in the same transaction and use database timestamps. Idempotent SQL provides any required uniqueness/index support.

### Test framework

**Decision**: Add Vitest as a dev dependency and test pure utilities independently of Next.js or Supabase.

**Rationale**: The required scoring, skill-normalization, redirect, and JSON parsing behavior can be covered quickly without network services or database fixtures. Route/database invariants are validated separately with focused integration/manual tests.

## Repository Findings

- `prisma/schema.prisma` is PostgreSQL and declares `DATABASE_URL` plus `DIRECT_URL`.
- Runtime Prisma usage is spread across `/api/session`, `/api/gap-detector`, `/api/resume-checker`, `/api/learning-plan` and saved/task routes, `/api/interview/*`, `/api/my-data`, `/api/health`, and `/auth/callback`.
- `supabase/01_schema.sql` currently attaches user-owned root rows to `auth.users`, while Prisma models attach them to `profiles`; the new SQL migration must reconcile this, backfill profiles first, and keep nested task/answer cascades.
- `supabase/00_RUN_ALL.sql` is the ordered SQL entry point; feature 002 must append `04_hardening.sql`.
- `vercel.json` already sets region `bom1` and `maxDuration: 30` for the six AI endpoints.
- Existing `.env.example` contains non-placeholder project information and must be replaced with safe placeholders before being treated as distributable setup documentation.

## References

1. Supabase, **Connect to your database** — connection-mode selection and connection URL guidance: <https://supabase.com/docs/guides/database/connecting-to-postgres>
2. Supabase, **Connection pooling and limits** — server-side pooling, transaction-mode serverless guidance, and client/backend connection limits: <https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits>
3. Prisma, **Supabase with Prisma ORM** — pooled `DATABASE_URL`, `pgbouncer=true`, and separate `DIRECT_URL` concepts: <https://www.prisma.io/docs/orm/overview/databases/supabase>
4. Prisma, **Connection URLs** — PostgreSQL URL syntax and percent-encoding reserved characters: <https://www.prisma.io/docs/orm/reference/connection-urls>

The Prisma documentation currently redirects to the latest version; project-specific compatibility remains pinned to the installed Prisma 5.21 dependency. The SQL `04_hardening.sql` and a connection smoke test against the configured project are the implementation acceptance gates.

### Cross-schema Auth foreign key and Prisma schema diff

The SQL schema intentionally keeps `public.profiles.id` linked to `auth.users(id)` with `ON DELETE CASCADE`. Prisma's `migrate diff --from-url` introspection fails with P4002 on this cross-schema foreign key because the Prisma schema does not enable `multiSchema` or model the Supabase `auth` schema. The CI-only drift test first asserts through `pg_constraint` that `profiles_id_fkey` points from `public.profiles(id)` to `auth.users(id)` with cascade deletion, then drops only that constraint from its disposable local test database before running the Prisma diff. The test refuses to perform that change unless `TEST_DATABASE_URL` uses `localhost` or `127.0.0.1` and its database name contains `test`.

This excluded constraint is still checked by the drift test's precondition and by the read-only `SC-003` check in `scripts/verify-supabase.ts`; it is not removed from production SQL. The verifier checks the referenced schemas, tables and columns, constraint name, and `ON DELETE CASCADE` action.

### Prisma schema drift findings and alignment

The CI drift report showed differences between the applied SQL schema and Prisma. SQL inspection confirms that primary-key UUID defaults use `gen_random_uuid()`, timestamp columns use `TIMESTAMPTZ` (PostgreSQL's default precision is 6), and foreign keys specify `ON DELETE CASCADE` while leaving `ON UPDATE` unspecified (PostgreSQL therefore uses `NO ACTION`). The integration drift check now prints `pg_get_constraintdef(oid)` for each relevant public foreign key before excluding the cross-schema profile constraint, so CI output also records the actual applied constraint names and actions.

| Difference | SQL source-of-truth definition | Prisma alignment |
|---|---|---|
| UUID primary-key defaults | `gen_random_uuid()` on generated-ID tables; `profiles.id` is supplied by Supabase Auth and has no default | Use `@default(dbgenerated("gen_random_uuid()"))` on generated IDs; keep `Profile.id` without a default |
| Timestamp column precision | `TIMESTAMPTZ`, equivalent to `TIMESTAMPTZ(6)` | Add `@db.Timestamptz(6)` while preserving `@default(now())` and `@updatedAt` |
| Foreign-key update action | `NO ACTION` by PostgreSQL default; SQL explicitly specifies `ON DELETE CASCADE` | Set `onDelete: Cascade, onUpdate: NoAction` on every Prisma relation |
| `profiles_id_fkey` cross-schema relation | `public.profiles(id)` references `auth.users(id)` with `ON DELETE CASCADE` | Keep `auth` out of `schema.prisma`; verify the constraint before dropping it only from the guarded disposable CI database for Prisma introspection, and check it read-only in `scripts/verify-supabase.ts` |

The foreign-key diagnostic's `pg_get_constraintdef` output is the evidence for the actual CI database constraint definitions; the current SQL source predicts that the delete action is `CASCADE` and the update action is `NO ACTION`. Constraint names are not remapped in Prisma because the SQL-generated names follow Prisma's default `<table>_<column>_fkey` names; the diagnostic will expose any contrary name in CI.
