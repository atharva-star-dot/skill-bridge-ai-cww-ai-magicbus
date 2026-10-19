import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { getUser, findUnique, updateSession, findGapReport } = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
  updateSession: vi.fn(),
  findGapReport: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    interviewSession: { findUnique, update: updateSession },
    skillGapReport: { findFirst: findGapReport },
  },
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

function createSession(scores: Array<number | null>) {
  return {
    id: "session-a",
    userId: "user-a",
    targetRole: "Developer",
    answers: scores.map((score, questionIndex) => ({
      id: `answer-${questionIndex}`,
      questionIndex,
      questionType: questionIndex === 4 ? "behavioral" : "technical",
      questionText: `Explain concept number ${questionIndex} clearly.`,
      userAnswer: "A detailed answer with a clear explanation.",
      score,
      feedback: null,
      sampleAnswer: null,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "");
  getUser.mockResolvedValue({
    data: { user: { id: "user-a" } },
    error: null,
  });
  findGapReport.mockResolvedValue(null);
  updateSession.mockResolvedValue({});
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/interview/summary", () => {
  it("refuses to summarize a session unless all five answers are scored", async () => {
    findUnique.mockResolvedValue(createSession([4, 6, 8, 5, null]));

    const response = await POST(
      new NextRequest("http://localhost/api/interview/summary", {
        method: "POST",
        body: JSON.stringify({ interviewSessionId: "session-a" }),
      })
    );

    expect(response.status).toBe(409);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("calculates completed summary score from the five stored scores", async () => {
    findUnique.mockResolvedValue(createSession([1, 3, 5, 7, 9]));

    const response = await POST(
      new NextRequest("http://localhost/api/interview/summary", {
        method: "POST",
        body: JSON.stringify({ interviewSessionId: "session-a" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      summary: {
        overallScore: 5,
        source: "fallback",
        perQuestionScores: [
          { questionIndex: 0, score: 1 },
          { questionIndex: 1, score: 3 },
          { questionIndex: 2, score: 5 },
          { questionIndex: 3, score: 7 },
          { questionIndex: 4, score: 9 },
        ],
      },
    });
    expect(updateSession).toHaveBeenCalledOnce();
  });

  it("clamps stored per-question scores before calculating the summary", async () => {
    findUnique.mockResolvedValue(createSession([0, 5, 100, 8, 11]));

    const response = await POST(
      new NextRequest("http://localhost/api/interview/summary", {
        method: "POST",
        body: JSON.stringify({ interviewSessionId: "session-a" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      summary: {
        overallScore: 6.8,
        perQuestionScores: [
          { questionIndex: 0, score: 1 },
          { questionIndex: 1, score: 5 },
          { questionIndex: 2, score: 10 },
          { questionIndex: 3, score: 8 },
          { questionIndex: 4, score: 10 },
        ],
      },
    });
  });
});
