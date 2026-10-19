import { AddressInfo } from 'node:net';
import { request as httpRequest, Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as gapDetector } from '@/app/api/gap-detector/route';
import { POST as learningPlan } from '@/app/api/learning-plan/route';
import { POST as resumeChecker } from '@/app/api/resume-checker/route';
import { POST as interviewStart } from '@/app/api/interview/start/route';
import { POST as interviewAnswer } from '@/app/api/interview/answer/route';
import { POST as interviewSummary } from '@/app/api/interview/summary/route';
import { prisma } from '@/lib/db';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/ai/rate-limit', () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    profile: { upsert: vi.fn(), findUnique: vi.fn() },
    skillGapReport: { create: vi.fn(), findFirst: vi.fn() },
    learningPlan: { deleteMany: vi.fn(), create: vi.fn() },
    resumeReview: { deleteMany: vi.fn(), create: vi.fn() },
    interviewSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    interviewAnswer: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

function makeInterviewSession(scored = false) {
  return {
    id: 'session-a',
    userId: 'user-a',
    targetRole: 'Developer',
    status: scored ? 'completed' : 'in_progress',
    currentQuestionIndex: 0,
    answers: Array.from({ length: 5 }, (_, questionIndex) => ({
      id: `answer-${questionIndex}`,
      questionIndex,
      questionType: questionIndex === 4 ? 'behavioral' : 'technical',
      questionText: `Explain concept number ${questionIndex} clearly.`,
      userAnswer: scored ? 'A complete stored answer.' : null,
      score: scored ? 6 : null,
      feedback: null,
      sampleAnswer: null,
    })),
  };
}

function request(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_MODEL', 'gemini-timeout-test');
  vi.stubEnv('GEMINI_FALLBACK_MODELS', '');
  getUser.mockResolvedValue({
    data: { user: { id: 'user-a', email: 'user@example.test', user_metadata: {} } },
    error: null,
  });
  vi.mocked(prisma.profile.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    id: 'user-a',
    targetRole: 'Developer',
  } as never);
  vi.mocked(prisma.skillGapReport.create).mockResolvedValue({} as never);
  vi.mocked(prisma.skillGapReport.findFirst).mockResolvedValue({
    targetRole: 'Developer',
    missingSkills: JSON.stringify([
      { name: 'React', priority: 'High', reason: 'Core skill', category: 'Core Technical' },
    ]),
    matchedSkills: JSON.stringify(['TypeScript']),
  } as never);
  vi.mocked(prisma.learningPlan.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.learningPlan.create).mockResolvedValue({
    id: 'plan-a',
    tasks: [],
  } as never);
  vi.mocked(prisma.resumeReview.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.resumeReview.create).mockResolvedValue({} as never);
  vi.mocked(prisma.interviewAnswer.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.interviewAnswer.update).mockResolvedValue({} as never);
  vi.mocked(prisma.interviewSession.findUnique).mockImplementation(
    (args) =>
      Promise.resolve(
        makeInterviewSession(args.where.id === 'session-scored')
      ) as never
  );
  vi.mocked(prisma.interviewSession.create).mockResolvedValue(
    makeInterviewSession() as never
  );
  vi.mocked(prisma.interviewSession.update).mockResolvedValue({} as never);

  const transaction = {
    $queryRaw: vi.fn().mockResolvedValue([{ allowed: true }]),
    resumeReview: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
    },
    interviewSession: {
      findUnique: vi.fn().mockResolvedValue(makeInterviewSession()),
      create: vi.fn().mockResolvedValue(makeInterviewSession()),
      update: vi.fn().mockResolvedValue({}),
    },
    interviewAnswer: { update: vi.fn().mockResolvedValue({}) },
  };
  vi.mocked(prisma.$transaction).mockImplementation(async (operation) => {
    if (typeof operation !== 'function') throw new Error('Expected interactive transaction');
    return operation(transaction as never);
  });
});

afterEach(() => vi.unstubAllEnvs());

describe('AI route deadline against a hanging local provider', () => {
  it(
    'returns fallback from every real AI route within 25 seconds and releases timers and sockets',
    async () => {
      let acceptedRequests = 0;
      let openSockets = 0;
      const server = new Server();
      server.on('connection', (socket) => {
        openSockets += 1;
        socket.once('close', () => {
          openSockets -= 1;
        });
      });
      server.on('request', (incoming) => {
        acceptedRequests += 1;
        incoming.resume();
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

      const address = server.address() as AddressInfo;
      const providerOrigin = `http://127.0.0.1:${address.port}`;
      const originalFetch = globalThis.fetch;
      const nativeSetTimeout = globalThis.setTimeout;
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const inputUrl =
          input instanceof Request ? input.url : input instanceof URL ? input.href : input;
        const targetUrl = new URL(inputUrl);
        const localUrl = new URL(`${targetUrl.pathname}${targetUrl.search}`, providerOrigin);
        const headers: Record<string, string> = {};
        new Headers(init?.headers).forEach((value, key) => {
          headers[key] = value;
        });
        headers.connection = 'close';

        return new Promise<Response>((resolve, reject) => {
          const outgoing = httpRequest(
            localUrl,
            {
              method: init?.method,
              headers,
              signal: init?.signal ?? undefined,
            },
            (incoming) => {
              incoming.resume();
              resolve(new Response(null, { status: incoming.statusCode ?? 500 }));
            }
          );
          outgoing.once('error', reject);
          if (typeof init?.body === 'string' || init?.body instanceof Uint8Array) {
            outgoing.write(init.body);
          }
          outgoing.end();
        });
      }) as typeof fetch;

      const startedAt = performance.now();
      try {
        const responses = await Promise.all([
          gapDetector(
            request('/api/gap-detector', { targetRole: 'Developer', currentSkills: [] })
          ),
          learningPlan(request('/api/learning-plan', { durationWeeks: 2 })),
          resumeChecker(
            request('/api/resume-checker', {
              targetRole: 'Developer',
              resumeText: 'An innocuous test resume text with enough content.',
            })
          ),
          interviewStart(
            request('/api/interview/start', { targetRole: 'Developer' })
          ),
          interviewAnswer(
            request('/api/interview/answer', {
              interviewSessionId: 'session-a',
              questionIndex: 0,
              userAnswer: 'A safe synthetic candidate answer.',
            })
          ),
          interviewSummary(
            request('/api/interview/summary', {
              interviewSessionId: 'session-scored',
            })
          ),
        ]);
        const durationMs = performance.now() - startedAt;
        const bodies = await Promise.all(responses.map((response) => response.json()));
        const fallbackSources = [
          bodies[0].source,
          bodies[1].source,
          bodies[2].source,
          bodies[3].interviewSession.source,
          bodies[4].evaluation.source,
          bodies[5].summary.source,
        ];

        expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200, 200]);
        expect(fallbackSources).toEqual(Array(6).fill('fallback'));
        expect(durationMs).toBeLessThan(25_000);
        expect(acceptedRequests).toBe(6);
        const deadlineTimers = setTimeoutSpy.mock.calls
          .map(([, delay], index) => ({
            delay,
            timer: setTimeoutSpy.mock.results[index]?.value,
          }))
          .filter(({ delay }) => delay === 22_000)
          .map(({ timer }) => timer);
        const clearedTimers = clearTimeoutSpy.mock.calls.map(([timer]) => timer);
        expect(deadlineTimers).toHaveLength(6);
        expect(deadlineTimers.every((timer) => clearedTimers.includes(timer))).toBe(true);
        const socketCloseDeadline = Date.now() + 2_000;
        while (openSockets > 0 && Date.now() < socketCloseDeadline) {
          await new Promise<void>((resolve) => nativeSetTimeout(resolve, 10));
        }
        expect(openSockets).toBe(0);
      } finally {
        globalThis.fetch = originalFetch;
        setTimeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
        await closeServer(server);
      }
    },
    30_000
  );
});
