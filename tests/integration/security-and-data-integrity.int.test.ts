import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as startInterview } from '@/app/api/interview/start/route';
import { POST as answerInterview } from '@/app/api/interview/answer/route';
import { prisma } from '@/lib/db';
import { reserveAiUsage } from '@/lib/ai/rate-limit';
import { deleteAuthUser, seedAuthUser } from './stub-auth';
import {
  assertDisposableTestDatabaseUrl,
  formatPrismaDiffFailure,
} from './prisma-diff';

const authState = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: authState.userId,
            email: `${authState.userId}@integration.test`,
            user_metadata: {},
          },
        },
        error: null,
      }),
    },
  }),
}));

const databaseUrl = process.env.TEST_DATABASE_URL;
const createdUsers = new Set<string>();

function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required for the integration test.');
  return url;
}

async function createUser(): Promise<string> {
  const userId = randomUUID();
  await seedAuthUser(prisma, userId, `${userId}@integration.test`);
  createdUsers.add(userId);
  authState.userId = userId;
  return userId;
}

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  const userIds = Array.from(createdUsers);
  createdUsers.clear();
  try {
    await Promise.all(userIds.map((userId) => deleteAuthUser(prisma, userId)));
  } finally {
    authState.userId = '';
    vi.unstubAllEnvs();
  }
});

describe.skipIf(!databaseUrl)('PostgreSQL security and integrity integration', () => {
  it('admits exactly five of twenty concurrent quota reservations at a limit of five', async () => {
    const userId = await createUser();
    const reservations = await Promise.all(
      Array.from({ length: 20 }, () => reserveAiUsage(userId, 5))
    );
    const allowed = reservations.filter((reservation) => reservation.allowed).length;

    expect(allowed).toBe(5);
    expect(reservations.length - allowed).toBe(15);
  });

  it('allows only one of two concurrent answers for the same question index', async () => {
    const userId = await createUser();
    vi.stubEnv('GEMINI_API_KEY', '');
    const session = await prisma.interviewSession.create({
      data: {
        userId,
        targetRole: 'Integration Engineer',
        status: 'in_progress',
        currentQuestionIndex: 0,
        answers: {
          create: Array.from({ length: 5 }, (_, questionIndex) => ({
            questionIndex,
            questionType: questionIndex === 4 ? 'behavioral' : 'technical',
            questionText: `Explain integration topic ${questionIndex}.`,
          })),
        },
      },
    });

    const responses = await Promise.all([
      answerInterview(
        post('/api/interview/answer', {
          interviewSessionId: session.id,
          questionIndex: 0,
          userAnswer: 'A complete integration-test answer.',
        })
      ),
      answerInterview(
        post('/api/interview/answer', {
          interviewSessionId: session.id,
          questionIndex: 0,
          userAnswer: 'A second integration-test answer.',
        })
      ),
    ]);
    const statuses = responses.map((response) => response.status).sort();
    const persistedAnswers = await prisma.interviewAnswer.count({
      where: { interviewSessionId: session.id, questionIndex: 0, score: { not: null } },
    });
    const updatedSession = await prisma.interviewSession.findUniqueOrThrow({
      where: { id: session.id },
    });

    expect(statuses).toEqual([200, 409]);
    expect(persistedAnswers).toBe(1);
    expect(updatedSession.currentQuestionIndex).toBe(1);
    expect(updatedSession.status).toBe('in_progress');
  });

  it('creates only three in-progress sessions from six concurrent starts', async () => {
    const userId = await createUser();
    vi.stubEnv('GEMINI_API_KEY', '');

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        startInterview(
          post('/api/interview/start', { targetRole: 'Integration Engineer' })
        )
      )
    );
    const statuses = responses.map((response) => response.status);
    const createdSessions = await prisma.interviewSession.count({
      where: { userId, status: 'in_progress' },
    });

    expect(statuses.filter((status) => status === 200)).toHaveLength(3);
    expect(statuses.filter((status) => status === 409)).toHaveLength(3);
    expect(createdSessions).toBe(3);
  });

  it('has no Prisma schema drift from the applied SQL schema', async () => {
    const testDatabaseUrl = getTestDatabaseUrl();
    assertDisposableTestDatabaseUrl(testDatabaseUrl);

    const foreignKeyDefinitions = await prisma.$queryRaw<
      Array<{ table_name: string; constraint_name: string; definition: string }>
    >`
      SELECT table_row.relname AS table_name,
             fk.conname AS constraint_name,
             pg_get_constraintdef(fk.oid) AS definition
      FROM pg_constraint AS fk
      JOIN pg_class AS table_row ON table_row.oid = fk.conrelid
      JOIN pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
      WHERE fk.contype = 'f'
        AND table_schema.nspname = 'public'
        AND table_row.relname IN (
          'profiles',
          'skill_gap_reports',
          'learning_plans',
          'plan_tasks',
          'resume_reviews',
          'interview_sessions',
          'interview_answers',
          'ai_usage'
        )
      ORDER BY table_row.relname, fk.conname
    `;
    console.info(
      '[schema-drift] Applied SQL foreign keys (Prisma relations expect onDelete: Cascade, onUpdate: NoAction):',
      JSON.stringify(foreignKeyDefinitions)
    );

    const foreignKeyRows = await prisma.$queryRaw<Array<{ passed: boolean }>>`
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
    expect(
      foreignKeyRows[0]?.passed,
      'Expected profiles_id_fkey to reference auth.users(id) with ON DELETE CASCADE before Prisma schema diff.'
    ).toBe(true);

    await prisma.$executeRawUnsafe(
      'ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey'
    );

    const prismaCli = resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
    const schemaPath = resolve(process.cwd(), 'prisma', 'schema.prisma');
    const result = spawnSync(
      process.execPath,
      [
        prismaCli,
        'migrate',
        'diff',
        '--from-url',
        testDatabaseUrl,
        '--to-schema-datamodel',
        schemaPath,
        '--exit-code',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: testDatabaseUrl,
          DIRECT_URL: testDatabaseUrl,
        },
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );

    expect(
      result.error,
      `Prisma schema-diff command could not execute (${result.error?.name ?? 'UnknownError'}).\n` +
        formatPrismaDiffFailure(result.status, result.stdout, result.stderr)
    ).toBeUndefined();
    expect(
      result.status,
      formatPrismaDiffFailure(result.status, result.stdout, result.stderr)
    ).toBe(0);
  });
});
