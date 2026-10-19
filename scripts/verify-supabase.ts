import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

type BooleanResult = { passed: boolean };

async function runCheck(
  prisma: PrismaClient,
  scId: string,
  description: string,
  query: () => Promise<boolean>
): Promise<boolean> {
  try {
    const passed = await query();
    console.log(`[${scId}] ${passed ? 'PASS' : 'FAIL'} - ${description}`);
    return passed;
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.log(`[${scId}] FAIL - ${description} (${errorName})`);
    return false;
  }
}

async function verifySupabase(): Promise<void> {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error('DIRECT_URL is required for read-only Supabase verification.');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });
  let failed = false;
  try {
    const checks = [
      await runCheck(prisma, 'SC-003', 'profiles references auth.users(id) with ON DELETE CASCADE', async () => {
        const rows = await prisma.$queryRaw<Array<BooleanResult>>`
          SELECT EXISTS (
            SELECT 1
            FROM pg_constraint AS fk
            JOIN pg_attribute AS profile_id
              ON profile_id.attrelid = fk.conrelid
             AND profile_id.attname = 'id'
            JOIN pg_attribute AS auth_id
              ON auth_id.attrelid = fk.confrelid
             AND auth_id.attname = 'id'
            WHERE fk.contype = 'f'
              AND fk.conname = 'profiles_id_fkey'
              AND fk.conrelid = 'public.profiles'::regclass
              AND fk.confrelid = 'auth.users'::regclass
              AND fk.confdeltype = 'c'
              AND fk.conkey = ARRAY[profile_id.attnum]::smallint[]
              AND fk.confkey = ARRAY[auth_id.attnum]::smallint[]
          ) AS passed
        `;
        return rows[0]?.passed === true;
      }),
      await runCheck(prisma, 'SC-003', 'user-owned and nested foreign keys cascade', async () => {
        const rows = await prisma.$queryRaw<Array<{ table_name: string; passed: boolean }>>`
          WITH expected(table_name, source_column, parent_table, parent_column) AS (
            VALUES
              ('skill_gap_reports', 'user_id', 'profiles', 'id'),
              ('learning_plans', 'user_id', 'profiles', 'id'),
              ('resume_reviews', 'user_id', 'profiles', 'id'),
              ('interview_sessions', 'user_id', 'profiles', 'id'),
              ('ai_usage', 'user_id', 'profiles', 'id'),
              ('plan_tasks', 'plan_id', 'learning_plans', 'id'),
              ('interview_answers', 'interview_session_id', 'interview_sessions', 'id')
          )
          SELECT expected.table_name,
                 EXISTS (
                   SELECT 1
                   FROM pg_constraint AS fk
                   JOIN pg_attribute AS source
                     ON source.attrelid = fk.conrelid
                    AND source.attname = expected.source_column
                   JOIN pg_attribute AS parent
                     ON parent.attrelid = fk.confrelid
                    AND parent.attname = expected.parent_column
                   WHERE fk.contype = 'f'
                     AND fk.conrelid = to_regclass(format('public.%I', expected.table_name))
                     AND fk.confrelid = to_regclass(format('public.%I', expected.parent_table))
                     AND fk.confdeltype = 'c'
                     AND fk.conkey = ARRAY[source.attnum]::smallint[]
                     AND fk.confkey = ARRAY[parent.attnum]::smallint[]
                 ) AS passed
          FROM expected
        `;
        return rows.length === 7 && rows.every((row) => row.passed);
      }),
      await runCheck(prisma, 'SC-012', 'legacy-upgrade column types match the Prisma/SQL schema', async () => {
        const rows = await prisma.$queryRaw<Array<{ passed: boolean }>>`
          WITH expected(table_name, column_name, expected_type) AS (
            VALUES
              ('profiles', 'id', 'uuid'),
              ('target_roles', 'id', 'uuid'),
              ('skill_gap_reports', 'id', 'uuid'),
              ('skill_gap_reports', 'user_id', 'uuid'),
              ('learning_plans', 'id', 'uuid'),
              ('learning_plans', 'user_id', 'uuid'),
              ('plan_tasks', 'id', 'uuid'),
              ('plan_tasks', 'plan_id', 'uuid'),
              ('resume_reviews', 'id', 'uuid'),
              ('resume_reviews', 'user_id', 'uuid'),
              ('interview_sessions', 'id', 'uuid'),
              ('interview_sessions', 'user_id', 'uuid'),
              ('interview_answers', 'id', 'uuid'),
              ('interview_answers', 'interview_session_id', 'uuid'),
              ('job_roles', 'id', 'uuid'),
              ('profiles', 'created_at', 'timestamp with time zone'),
              ('profiles', 'updated_at', 'timestamp with time zone'),
              ('target_roles', 'created_at', 'timestamp with time zone'),
              ('skill_gap_reports', 'created_at', 'timestamp with time zone'),
              ('learning_plans', 'created_at', 'timestamp with time zone'),
              ('resume_reviews', 'created_at', 'timestamp with time zone'),
              ('interview_sessions', 'created_at', 'timestamp with time zone'),
              ('interview_answers', 'created_at', 'timestamp with time zone'),
              ('job_roles', 'created_at', 'timestamp with time zone'),
              ('plan_tasks', 'is_completed', 'boolean'),
              ('plan_tasks', 'estimated_hours', 'double precision'),
              ('ai_usage', 'id', 'uuid'),
              ('ai_usage', 'user_id', 'uuid'),
              ('ai_usage', 'created_at', 'timestamp with time zone')
          )
          SELECT columns.data_type = expected.expected_type AS passed
          FROM expected
          LEFT JOIN information_schema.columns AS columns
            ON columns.table_schema = 'public'
           AND columns.table_name = expected.table_name
           AND columns.column_name = expected.column_name
        `;
        return rows.length === 29 && rows.every((row) => row.passed);
      }),
      await runCheck(prisma, 'SC-013', 'all required SELECT and DELETE owner policies exist', async () => {
        const rows = await prisma.$queryRaw<Array<{ passed: boolean }>>`
          WITH expected(table_name, policy_name, command) AS (
            VALUES
              ('skill_gap_reports', 'skill_gap_reports_select_own', 'SELECT'),
              ('skill_gap_reports', 'skill_gap_reports_delete_own', 'DELETE'),
              ('learning_plans', 'learning_plans_select_own', 'SELECT'),
              ('learning_plans', 'learning_plans_delete_own', 'DELETE'),
              ('resume_reviews', 'resume_reviews_select_own', 'SELECT'),
              ('resume_reviews', 'resume_reviews_delete_own', 'DELETE'),
              ('interview_sessions', 'interview_sessions_select_own', 'SELECT'),
              ('interview_sessions', 'interview_sessions_delete_own', 'DELETE'),
              ('plan_tasks', 'plan_tasks_select_own', 'SELECT'),
              ('plan_tasks', 'plan_tasks_delete_own', 'DELETE'),
              ('interview_answers', 'interview_answers_select_own', 'SELECT'),
              ('interview_answers', 'interview_answers_delete_own', 'DELETE')
          )
          SELECT EXISTS (
                   SELECT 1
                   FROM pg_policies AS policy
                   WHERE policy.schemaname = 'public'
                     AND policy.tablename = expected.table_name
                     AND policy.policyname = expected.policy_name
                     AND policy.cmd = expected.command
                 ) AS passed
          FROM expected
        `;
        return rows.length === 12 && rows.every((row) => row.passed);
      }),
      await runCheck(prisma, 'SC-013', 'anon and authenticated have no privileges on protected tables', async () => {
        const rows = await prisma.$queryRaw<Array<{ passed: boolean }>>`
          WITH protected_tables(table_name) AS (
            VALUES
              ('skill_gap_reports'),
              ('learning_plans'),
              ('plan_tasks'),
              ('resume_reviews'),
              ('interview_sessions'),
              ('interview_answers'),
              ('ai_usage')
          ),
          roles(role_name) AS (
            VALUES ('anon'), ('authenticated')
          ),
          privileges(privilege_name) AS (
            VALUES
              ('SELECT'),
              ('INSERT'),
              ('UPDATE'),
              ('DELETE'),
              ('TRUNCATE'),
              ('REFERENCES'),
              ('TRIGGER')
          )
          SELECT NOT has_table_privilege(
                   roles.role_name,
                   format('public.%I', protected_tables.table_name),
                   privileges.privilege_name
                 ) AS passed
          FROM protected_tables
          CROSS JOIN roles
          CROSS JOIN privileges
        `;
        return rows.length === 98 && rows.every((row) => row.passed);
      }),
      await runCheck(prisma, 'SC-003', 'interview answers have the required unique index', async () => {
        const rows = await prisma.$queryRaw<Array<BooleanResult>>`
          SELECT EXISTS (
            SELECT 1
            FROM pg_class AS table_row
            JOIN pg_namespace AS table_schema
              ON table_schema.oid = table_row.relnamespace
            JOIN pg_index AS index_row
              ON index_row.indrelid = table_row.oid
            JOIN pg_class AS index_class
              ON index_class.oid = index_row.indexrelid
            JOIN pg_attribute AS session_column
              ON session_column.attrelid = table_row.oid
             AND session_column.attname = 'interview_session_id'
            JOIN pg_attribute AS question_column
              ON question_column.attrelid = table_row.oid
             AND question_column.attname = 'question_index'
            WHERE table_schema.nspname = 'public'
              AND table_row.relname = 'interview_answers'
              AND index_class.relname = 'interview_answers_session_question_key'
              AND index_row.indisunique
              AND index_row.indisvalid
              AND index_row.indnkeyatts = 2
              AND index_row.indkey[0] = session_column.attnum
              AND index_row.indkey[1] = question_column.attnum
          ) AS passed
        `;
        return rows[0]?.passed === true;
      }),
      await runCheck(prisma, 'SC-003', 'the Auth profile-creation trigger is installed and enabled', async () => {
        const rows = await prisma.$queryRaw<Array<BooleanResult>>`
          SELECT EXISTS (
            SELECT 1
            FROM pg_trigger AS trigger_row
            JOIN pg_class AS auth_users
              ON auth_users.oid = trigger_row.tgrelid
            JOIN pg_namespace AS auth_schema
              ON auth_schema.oid = auth_users.relnamespace
            WHERE auth_schema.nspname = 'auth'
              AND auth_users.relname = 'users'
              AND trigger_row.tgname = 'on_auth_user_created'
              AND NOT trigger_row.tgisinternal
              AND trigger_row.tgenabled <> 'D'
              AND trigger_row.tgfoid = 'public.handle_new_user()'::regprocedure
              AND lower(pg_get_triggerdef(trigger_row.oid))
                  LIKE 'create trigger on_auth_user_created after insert on auth.users%'
          ) AS passed
        `;
        return rows[0]?.passed === true;
      }),
    ];

    failed = checks.some((passed) => !passed);
  } finally {
    await prisma.$disconnect();
  }

  if (failed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifySupabase().catch((error: unknown) => {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`Supabase verification could not complete (${errorName}).`);
    process.exitCode = 1;
  });
}
