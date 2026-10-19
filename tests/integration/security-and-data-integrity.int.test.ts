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
import { formatPrismaDiffFailure } from './prisma-diff';

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

  it('has no Prisma schema drift from the applied SQL schema', () => {
    const prismaCli = resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
    const schemaPath = resolve(process.cwd(), 'prisma', 'schema.prisma');
    const result = spawnSync(
      process.execPath,
      [
        prismaCli,
        'migrate',
        'diff',
        '--from-url',
        getTestDatabaseUrl(),
        '--to-schema-datamodel',
        schemaPath,
        '--exit-code',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: getTestDatabaseUrl(),
          DIRECT_URL: getTestDatabaseUrl(),
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
