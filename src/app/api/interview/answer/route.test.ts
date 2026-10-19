import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const {
  getUser,
  findUnique,
  findUniqueInTransaction,
  updateAnswer,
  updateSession,
  executeGeminiWithRetry,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
  findUniqueInTransaction: vi.fn(),
  updateAnswer: vi.fn(),
  updateSession: vi.fn(),
  executeGeminiWithRetry: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser },
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    interviewSession: { findUnique, update: updateSession },
    interviewAnswer: { update: updateAnswer },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/ai/gemini", () => ({
  executeGeminiWithRetry,
  getActiveModel: () => "test-model",
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

function createSession(currentQuestionIndex: number, answeredIndexes: number[] = []) {
  return {
    id: "session-a",
    userId: "user-a",
    targetRole: "Developer",
    status: "in_progress",
    currentQuestionIndex,
    answers: Array.from({ length: 5 }, (_, questionIndex) => ({
      id: `answer-${questionIndex}`,
      questionIndex,
      questionType: questionIndex === 4 ? "behavioral" : "technical",
      questionText: `Explain concept number ${questionIndex} clearly.`,
      userAnswer: answeredIndexes.includes(questionIndex) ? "already answered" : null,
      score: answeredIndexes.includes(questionIndex) ? 6 : null,
      feedback: null,
      sampleAnswer: null,
    })),
  };
}

function configureTransaction(transactionSession: ReturnType<typeof createSession>) {
  vi.mocked(prisma.$transaction).mockImplementation(async (operation) => {
    if (typeof operation !== "function") throw new Error("Expected interactive transaction");
    return operation({
      $queryRaw: vi.fn().mockResolvedValue([]),
      interviewSession: {
        findUnique: findUniqueInTransaction,
        update: updateSession,
      },
      interviewAnswer: { update: updateAnswer },
    } as never);
  });
  findUniqueInTransaction.mockResolvedValue(transactionSession);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "");
  getUser.mockResolvedValue({
    data: { user: { id: "user-a" } },
    error: null,
  });
  updateAnswer.mockResolvedValue({});
  updateSession.mockResolvedValue({});
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/interview/answer error handling", () => {
  it("does not log the submitted answer or raw database error", async () => {
    const secret = "private interview answer";
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    findUnique.mockRejectedValue(new Error(secret));

    const response = await POST(
      new NextRequest("http://localhost/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({
          interviewSessionId: "session-a",
          questionIndex: 0,
          userAnswer: secret,
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to evaluate answer" });
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
    log.mockRestore();
  });

  it("rejects an out-of-order answer with 409 and performs no writes", async () => {
    findUnique.mockResolvedValue(createSession(0));

    const response = await POST(
      new NextRequest("http://localhost/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({
          interviewSessionId: "session-a",
          questionIndex: 3,
          userAnswer: "A detailed answer for the fourth question.",
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(updateAnswer).not.toHaveBeenCalled();
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("rejects an already answered question with 409 and performs no writes", async () => {
    findUnique.mockResolvedValue(createSession(0, [0]));

    const response = await POST(
      new NextRequest("http://localhost/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({
          interviewSessionId: "session-a",
          questionIndex: 0,
          userAnswer: "A replacement answer for the question.",
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(updateAnswer).not.toHaveBeenCalled();
  });

  it("updates the answer and advances the session in one transaction", async () => {
    const session = createSession(0);
    findUnique.mockResolvedValue(session);
    configureTransaction(session);

    const response = await POST(
      new NextRequest("http://localhost/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({
          interviewSessionId: "session-a",
          questionIndex: 0,
          userAnswer: "A detailed answer that explains the concept.",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      evaluation: { source: "fallback" },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(updateAnswer).toHaveBeenCalledOnce();
    expect(updateSession).toHaveBeenCalledWith({
      where: { id: "session-a" },
      data: { currentQuestionIndex: 1 },
    });
  });

  it("completes only when the fifth answer leaves all five answers scored", async () => {
    const session = createSession(4, [0, 1, 2, 3]);
    findUnique.mockResolvedValue(session);
    configureTransaction(session);

    const response = await POST(
      new NextRequest("http://localhost/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({
          interviewSessionId: "session-a",
          questionIndex: 4,
          userAnswer: "A detailed behavioral response with an outcome.",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(updateSession).toHaveBeenCalledWith({
      where: { id: "session-a" },
      data: { currentQuestionIndex: 5, status: "completed" },
    });
    await expect(response.json()).resolves.toMatchObject({ nextQuestionIndex: 5, isCompleted: true });
  });

  it("does not complete when any earlier answer has no score", async () => {
    const session = createSession(4, [0, 1, 3]);
    findUnique.mockResolvedValue(session);
    configureTransaction(session);

    const response = await POST(
      new NextRequest("http://localhost/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({
          interviewSessionId: "session-a",
          questionIndex: 4,
          userAnswer: "A detailed behavioral response with an outcome.",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(updateSession).toHaveBeenCalledWith({
      where: { id: "session-a" },
      data: { currentQuestionIndex: 5 },
    });
    await expect(response.json()).resolves.toMatchObject({ nextQuestionIndex: 5, isCompleted: false });
  });

  it.each([
    { aiScore: -4, clampedScore: 1 },
    { aiScore: 99, clampedScore: 10 },
  ])("clamps an AI answer score of $aiScore to $clampedScore", async ({
    aiScore,
    clampedScore,
  }) => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const session = createSession(0);
    findUnique.mockResolvedValue(session);
    configureTransaction(session);
    executeGeminiWithRetry.mockResolvedValue({
      score: aiScore,
      strengths: ["Clear explanation"],
      improvements: ["Add an example"],
      improvedSampleAnswer: "A sufficiently detailed model answer for this question.",
      source: "ai",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({
          interviewSessionId: "session-a",
          questionIndex: 0,
          userAnswer: "A detailed answer that explains the concept.",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      evaluation: { score: clampedScore },
    });
    expect(updateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ score: clampedScore }) })
    );
  });
});
