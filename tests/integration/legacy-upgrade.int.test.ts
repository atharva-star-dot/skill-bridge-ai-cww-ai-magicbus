import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertDisposableTestDatabaseUrl,
  formatPrismaDiffFailure,
} from './prisma-diff';

const baseDatabaseUrl = process.env.TEST_DATABASE_URL;
const schemaPath = resolve(process.cwd(), 'prisma', 'schema.prisma');
const prismaCli = resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
const fixturePath = resolve(
  process.cwd(),
  'tests',
  'integration',
  'fixtures',
  'legacy-text-schema.sql'
);
const migrationPath = resolve(
  process.cwd(),
  'supabase',
  '06_upgrade_legacy_text_schema.sql'
);
const databases: Array<{ name: string; url: string }> = [];
const connections: PrismaClient[] = [];

const ids = {
  user: '10000000-0000-4000-8000-000000000001',
  report: '20000000-0000-4000-8000-000000000001',
  plan: '30000000-0000-4000-8000-000000000001',
  taskIncomplete: '40000000-0000-4000-8000-000000000001',
  taskComplete: '40000000-0000-4000-8000-000000000002',
  review: '50000000-0000-4000-8000-000000000001',
  session: '60000000-0000-4000-8000-000000000001',
  answer0: '70000000-0000-4000-8000-000000000001',
  answer1: '70000000-0000-4000-8000-000000000002',
};

function createClient(url: string): PrismaClient {
  const client = new PrismaClient({ datasources: { db: { url } } });
  connections.push(client);
  return client;
}

function executeSqlFile(url: string, filePath: string): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'db', 'execute', '--schema', schemaPath, '--file', filePath],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: url,
        DIRECT_URL: url,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    }
  );

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr || result.error?.name || '',
  };
}

function processOutput(result: { stdout: string; stderr: string }): string {
  return `${result.stdout}\n${result.stderr}`
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, 'postgresql://[REDACTED]')
    .replace(/(password\s*[=:]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

function getPrismaDiff(url: string): {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
} {
  const result = spawnSync(
    process.execPath,
    [
      prismaCli,
      'migrate',
      'diff',
      '--from-url',
      url,
      '--to-schema-datamodel',
      schemaPath,
      '--exit-code',
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: url,
        DIRECT_URL: url,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    }
  );
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

async function createLegacyDatabase(): Promise<PrismaClient> {
  const url = baseDatabaseUrl;
  if (!url) throw new Error('TEST_DATABASE_URL is required.');
  assertDisposableTestDatabaseUrl(url);

  const name = `legacy_upgrade_${randomUUID().replace(/-/g, '')}_test`;
  const admin = createClient(url);
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);

  const target = new URL(url);
  target.pathname = `/${name}`;
  const targetUrl = target.toString();
  databases.push({ name, url: targetUrl });

  const fixture = executeSqlFile(targetUrl, fixturePath);
  expect(
    fixture.status,
    `Could not initialize isolated legacy fixture (exit ${String(fixture.status)}).`
  ).toBe(0);

  return createClient(targetUrl);
}

async function insertRepresentativeRows(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (${ids.user}::uuid, 'legacy@example.test', '{}'::jsonb)
  `;
  await prisma.$executeRaw`
    INSERT INTO public.profiles (id, email, full_name, target_role, current_skills, readiness_score, created_at)
    VALUES (
      ${ids.user}, 'legacy@example.test', 'Legacy User', 'Developer', '[]', 50,
      '2026-01-02T03:04:05.123+00:00'
    )
  `;
  await prisma.$executeRaw`
    INSERT INTO public.target_roles
      (id, slug, title, category, description, required_skills, good_to_have_skills)
    VALUES
      ('80000000-0000-4000-8000-000000000001', 'legacy-role', 'Legacy Role',
       'Engineering', 'Legacy fixture', '[]', '[]')
  `;
  await prisma.$executeRaw`
    INSERT INTO public.skill_gap_reports
      (id, user_id, target_role, readiness_score, matched_skills, missing_skills, summary, created_at)
    VALUES
      (${ids.report}, ${ids.user}, 'Developer', 50, '[]', '[]', 'Legacy report',
       '2026-01-03T04:05:06.456+00:00')
  `;
  await prisma.$executeRaw`
    INSERT INTO public.learning_plans (id, user_id, target_role)
    VALUES (${ids.plan}, ${ids.user}, 'Developer')
  `;
  await prisma.$executeRaw`
    INSERT INTO public.plan_tasks (id, plan_id, week_number, title, description, estimated_hours, is_completed)
    VALUES
      (${ids.taskIncomplete}, ${ids.plan}, 1, 'Incomplete task', 'Legacy task', 1.25, 0),
      (${ids.taskComplete}, ${ids.plan}, 2, 'Complete task', 'Legacy task', 2.5, 1)
  `;
  await prisma.$executeRaw`
    INSERT INTO public.resume_reviews
      (id, user_id, target_role, ats_score, strengths, weaknesses, missing_keywords, bullet_rewrites)
    VALUES (${ids.review}, ${ids.user}, 'Developer', 70, '[]', '[]', '[]', '[]')
  `;
  await prisma.$executeRaw`
    INSERT INTO public.interview_sessions (id, user_id, target_role, created_at)
    VALUES (${ids.session}, ${ids.user}, 'Developer', '2026-01-04 05:06:07+00')
  `;
  await prisma.$executeRaw`
    INSERT INTO public.interview_answers
      (id, interview_session_id, question_index, question_type, question_text)
    VALUES
      (${ids.answer0}, ${ids.session}, 0, 'technical', 'Legacy question 0'),
      (${ids.answer1}, ${ids.session}, 1, 'technical', 'Legacy question 1')
  `;
  await prisma.$executeRaw`
    INSERT INTO public.job_roles
      (id, title, company, location, experience_level, salary_range, skills, apply_url)
    VALUES
      ('90000000-0000-4000-8000-000000000001', 'Legacy Job', 'Legacy Co',
       'Remote', 'Entry', 'N/A', '[]', 'https://example.test')
  `;
}

async function tableCounts(prisma: PrismaClient): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string; row_count: bigint }>>`
    SELECT table_name, row_count
    FROM (
      SELECT 'profiles' AS table_name, count(*) AS row_count FROM public.profiles
      UNION ALL SELECT 'target_roles', count(*) FROM public.target_roles
      UNION ALL SELECT 'skill_gap_reports', count(*) FROM public.skill_gap_reports
      UNION ALL SELECT 'learning_plans', count(*) FROM public.learning_plans
      UNION ALL SELECT 'plan_tasks', count(*) FROM public.plan_tasks
      UNION ALL SELECT 'resume_reviews', count(*) FROM public.resume_reviews
      UNION ALL SELECT 'interview_sessions', count(*) FROM public.interview_sessions
      UNION ALL SELECT 'interview_answers', count(*) FROM public.interview_answers
      UNION ALL SELECT 'job_roles', count(*) FROM public.job_roles
    ) AS counts
  `;
  return Object.fromEntries(rows.map((row) => [row.table_name, Number(row.row_count)]));
}

async function expectGuardFailure(
  prisma: PrismaClient,
  expectedMessage: string
): Promise<void> {
  const database = databases[databases.length - 1];
  if (!database) throw new Error('No isolated legacy database is registered.');
  const result = executeSqlFile(database.url, migrationPath);
  expect(
    result.status,
    `Expected migration guard "${expectedMessage}" to abort.`
  ).not.toBe(0);
  expect(processOutput(result)).toContain(expectedMessage);
  const unchanged = await prisma.$queryRaw<Array<{ data_type: string }>>`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
  `;
  expect(unchanged[0]?.data_type).toBe('text');
}

afterEach(async () => {
  await Promise.all(connections.splice(0).map((client) => client.$disconnect()));
  if (!baseDatabaseUrl) return;
  const admin = new PrismaClient({ datasources: { db: { url: baseDatabaseUrl } } });
  try {
    for (const database of databases.splice(0)) {
      await admin.$queryRaw`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = ${database.name} AND pid <> pg_backend_pid()
      `;
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${database.name}"`);
    }
  } finally {
    await admin.$disconnect();
  }
});

describe.skipIf(!baseDatabaseUrl)('Legacy text-schema in-place upgrade', () => {
  it('preserves rows and values, installs target types and cascades, and reruns safely', async () => {
    const prisma = await createLegacyDatabase();
    await insertRepresentativeRows(prisma);
    const countsBefore = await tableCounts(prisma);

    const isolatedDatabase = databases[databases.length - 1];
    if (!isolatedDatabase) throw new Error('Isolated database setup did not register its URL.');
    const firstRun = executeSqlFile(isolatedDatabase.url, migrationPath);
    expect(firstRun.status, processOutput(firstRun)).toBe(0);
    const secondRun = executeSqlFile(isolatedDatabase.url, migrationPath);
    expect(secondRun.status, processOutput(secondRun)).toBe(0);

    expect(await tableCounts(prisma)).toEqual(countsBefore);

    const types = await prisma.$queryRaw<Array<{ passed: boolean }>>`
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
          ('plan_tasks', 'estimated_hours', 'double precision')
      )
      SELECT expected.table_name || '.' || expected.column_name AS column_name,
             columns.data_type = expected.expected_type AS passed
      FROM expected
      JOIN information_schema.columns AS columns
        ON columns.table_schema = 'public'
       AND columns.table_name = expected.table_name
       AND columns.column_name = expected.column_name
    `;
    expect(types).toHaveLength(26);
    expect(types.every((column) => column.passed)).toBe(true);

    const taskValues = await prisma.$queryRaw<
      Array<{ is_completed: boolean; estimated_hours: number }>
    >`
      SELECT is_completed, estimated_hours
      FROM public.plan_tasks
      ORDER BY week_number
    `;
    expect(taskValues).toEqual([
      { is_completed: false, estimated_hours: 1.25 },
      { is_completed: true, estimated_hours: 2.5 },
    ]);

    const timestamp = await prisma.$queryRaw<Array<{ preserved: boolean }>>`
      SELECT created_at = '2026-01-02T03:04:05.123+00:00'::timestamptz AS preserved
      FROM public.profiles WHERE id = ${ids.user}::uuid
    `;
    expect(timestamp[0]?.preserved).toBe(true);

    const generatedDefaults = await prisma.$queryRaw<Array<{ generated: boolean }>>`
      SELECT column_default LIKE '%gen_random_uuid%' AS generated
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'id'
        AND table_name IN (
          'target_roles', 'skill_gap_reports', 'learning_plans', 'plan_tasks',
          'resume_reviews', 'interview_sessions', 'interview_answers', 'job_roles', 'ai_usage'
        )
    `;
    const profileDefault = await prisma.$queryRaw<Array<{ column_default: string | null }>>`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
    `;
    expect(generatedDefaults).toHaveLength(9);
    expect(generatedDefaults.every((column) => column.generated)).toBe(true);
    expect(profileDefault[0]?.column_default).toBeNull();

    const authForeignKey = await prisma.$queryRaw<Array<{ passed: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint AS fk
        JOIN pg_attribute AS profile_id
          ON profile_id.attrelid = fk.conrelid AND profile_id.attname = 'id'
        JOIN pg_attribute AS auth_id
          ON auth_id.attrelid = fk.confrelid AND auth_id.attname = 'id'
        WHERE fk.contype = 'f'
          AND fk.conname = 'profiles_id_fkey'
          AND fk.conrelid = 'public.profiles'::regclass
          AND fk.confrelid = 'auth.users'::regclass
          AND fk.confdeltype = 'c'
          AND fk.conkey = ARRAY[profile_id.attnum]::smallint[]
          AND fk.confkey = ARRAY[auth_id.attnum]::smallint[]
      ) AS passed
    `;
    expect(authForeignKey[0]?.passed).toBe(true);
    await prisma.$executeRawUnsafe(
      'ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey'
    );
    const diff = getPrismaDiff(isolatedDatabase.url);
    const diffFailure = formatPrismaDiffFailure(diff.status, diff.stdout, diff.stderr);
    expect(diff.error, diffFailure).toBeUndefined();
    expect(diff.status, diffFailure).toBe(0);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
    `);

    const policyCount = await prisma.$queryRaw<Array<{ policy_count: bigint }>>`
      SELECT count(*) AS policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN (
          'profiles', 'skill_gap_reports', 'learning_plans', 'plan_tasks',
          'resume_reviews', 'interview_sessions', 'interview_answers'
        )
    `;
    expect(Number(policyCount[0]?.policy_count)).toBe(14);
    const trigger = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
          AND NOT tgisinternal
      ) AS exists
    `;
    expect(trigger[0]?.exists).toBe(true);

    const quotaReservations = await Promise.all(
      Array.from({ length: 20 }, () =>
        prisma.$queryRaw<Array<{ allowed: boolean }>>`
          SELECT allowed
          FROM public.reserve_ai_usage(${ids.user}::uuid, 5::integer)
        `
      )
    );
    expect(quotaReservations.filter((rows) => rows[0]?.allowed)).toHaveLength(5);

    const sessionStarts = await Promise.all(
      Array.from({ length: 6 }, () =>
        prisma.$transaction(async (transaction) => {
          const permission = await transaction.$queryRaw<Array<{ allowed: boolean }>>`
            SELECT public.can_start_interview(${ids.user}::uuid, 3::integer) AS allowed
          `;
          if (!permission[0]?.allowed) return false;
          await transaction.$executeRaw`
            INSERT INTO public.interview_sessions (user_id, target_role)
            VALUES (${ids.user}::uuid, 'Developer')
          `;
          return true;
        })
      )
    );
    expect(sessionStarts.filter(Boolean)).toHaveLength(3);

    await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${ids.user}::uuid`;
    expect(await tableCounts(prisma)).toEqual({
      profiles: 0,
      target_roles: 1,
      skill_gap_reports: 0,
      learning_plans: 0,
      plan_tasks: 0,
      resume_reviews: 0,
      interview_sessions: 0,
      interview_answers: 0,
      job_roles: 1,
    });
    const remainingQuota = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM public.ai_usage WHERE user_id = ${ids.user}::uuid
    `;
    expect(Number(remainingQuota[0]?.count)).toBe(0);
  }, 120_000);

  it('aborts on a non-UUID identifier before changing the legacy schema', async () => {
    const prisma = await createLegacyDatabase();
    await insertRepresentativeRows(prisma);
    await prisma.$executeRaw`
      INSERT INTO public.skill_gap_reports
        (id, user_id, target_role, readiness_score, matched_skills, missing_skills, summary)
      VALUES ('not-a-uuid', ${ids.user}, 'Developer', 0, '[]', '[]', 'invalid ID')
    `;
    await expectGuardFailure(prisma, 'contains 1 null or invalid UUID values');
  }, 120_000);

  it('aborts when a profile has no matching Auth user', async () => {
    const prisma = await createLegacyDatabase();
    await insertRepresentativeRows(prisma);
    await prisma.$executeRaw`
      INSERT INTO public.profiles (id, email, full_name)
      VALUES ('10000000-0000-4000-8000-000000000099', 'orphan@example.test', 'Orphan')
    `;
    await expectGuardFailure(prisma, 'profiles have no matching auth.users row');
  }, 120_000);

  it('aborts when duplicate interview answer keys exist', async () => {
    const prisma = await createLegacyDatabase();
    await insertRepresentativeRows(prisma);
    await prisma.$executeRaw`
      INSERT INTO public.interview_answers
        (id, interview_session_id, question_index, question_type, question_text)
      VALUES ('70000000-0000-4000-8000-000000000099', ${ids.session}, 0, 'technical', 'Duplicate')
    `;
    await expectGuardFailure(prisma, 'duplicate (interview_session_id, question_index) rows exist');
  }, 120_000);

  it('aborts when a timestamp cannot be parsed', async () => {
    const prisma = await createLegacyDatabase();
    await insertRepresentativeRows(prisma);
    await prisma.$executeRaw`
      UPDATE public.profiles SET created_at = 'not-a-timestamp' WHERE id = ${ids.user}
    `;
    await expectGuardFailure(prisma, 'profiles.created_at contains unparsable timestamps');
  }, 120_000);
});
