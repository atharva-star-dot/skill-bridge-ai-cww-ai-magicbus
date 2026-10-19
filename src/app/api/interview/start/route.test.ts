import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const { getUser, executeGeminiWithRetry } = vi.hoisted(() => ({
  getUser: vi.fn(),
  executeGeminiWithRetry: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: { upsert: vi.fn() },
    skillGapReport: { findFirst: vi.fn() },
    interviewAnswer: { findMany: vi.fn() },
    interviewSession: { create: vi.fn() },
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

function createInterviewSessionRecord(id = "interview-a") {
  return {
    id,
    targetRole: "Developer",
    status: "in_progress",
    currentQuestionIndex: 0,
    answers: Array.from({ length: 5 }, (_, questionIndex) => ({
      id: `answer-${questionIndex}`,
      questionIndex,
      questionType: questionIndex === 4 ? "behavioral" : "technical",
      questionText: `Explain concept number ${questionIndex} clearly.`,
      userAnswer: null,
      score: null,
      feedback: null,
      sampleAnswer: null,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  getUser.mockResolvedValue({
    data: { user: { id: "user-a", email: "user@example.com", user_metadata: {} } },
    error: null,
  });
  vi.mocked(prisma.profile.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.skillGapReport.findFirst).mockResolvedValue({
    missingSkills: JSON.stringify([{ name: "React" }]),
  } as never);
  vi.mocked(prisma.interviewAnswer.findMany).mockResolvedValue([]);
  vi.mocked(prisma.interviewSession.create).mockResolvedValue(
    createInterviewSessionRecord() as never
  );
  vi.mocked(prisma.$transaction).mockImplementation((operation) => {
    if (typeof operation !== "function") {
      throw new Error("Expected interactive transaction");
    }
    return operation({
      $queryRaw: vi.fn().mockResolvedValue([{ allowed: true }]),
      interviewSession: {
        create: vi.fn().mockResolvedValue(createInterviewSessionRecord()),
      },
    } as never) as never;
  });
  executeGeminiWithRetry.mockRejectedValue(new Error("Gemini overall deadline exceeded"));
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/interview/start fallback", () => {
  it("returns five fallback questions and preserves the response shape after AI failure", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await POST(
      new NextRequest("http://localhost/api/interview/start", {
        method: "POST",
        body: JSON.stringify({ targetRole: "Developer" }),
      })
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      success: true,
      interviewSession: {
        id: "interview-a",
        status: "in_progress",
        currentQuestionIndex: 0,
        source: "fallback",
        questions: expect.arrayContaining([
          expect.objectContaining({ questionIndex: 0 }),
          expect.objectContaining({ questionIndex: 4 }),
        ]),
      },
    });
    expect(result.interviewSession.questions).toHaveLength(5);
    warning.mockRestore();
  });

  it("does not create a fourth concurrent in-progress session", async () => {
    let activeSessions = 0;
    const sessionRecord = createInterviewSessionRecord("interview-cap");
    vi.mocked(prisma.$transaction).mockImplementation((operation) => {
      if (typeof operation !== "function") {
        throw new Error("Expected interactive transaction");
      }
      return operation({
        $queryRaw: vi.fn(async () => {
          if (activeSessions >= 3) return [{ allowed: false }];
          activeSessions += 1;
          return [{ allowed: true }];
        }),
        interviewSession: { create: vi.fn().mockResolvedValue(sessionRecord) },
      } as never) as never;
    });

    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        POST(
          new NextRequest("http://localhost/api/interview/start", {
            method: "POST",
            body: JSON.stringify({ targetRole: "Developer" }),
          })
        )
      )
    );

    expect(responses.filter((response) => response.status === 200)).toHaveLength(3);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect(activeSessions).toBe(3);
  });
});
