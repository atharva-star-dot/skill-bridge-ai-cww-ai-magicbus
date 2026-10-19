import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { POST as gapDetector } from "@/app/api/gap-detector/route";
import { POST as learningPlan } from "@/app/api/learning-plan/route";
import { POST as resumeChecker } from "@/app/api/resume-checker/route";
import { POST as interviewStart } from "@/app/api/interview/start/route";
import { POST as interviewAnswer } from "@/app/api/interview/answer/route";
import { POST as interviewSummary } from "@/app/api/interview/summary/route";

const { getUser, findInterviewSession, enforceAiRateLimit } = vi.hoisted(() => ({
  getUser: vi.fn(),
  findInterviewSession: vi.fn(),
  enforceAiRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: { findUnique: vi.fn(), upsert: vi.fn() },
    skillGapReport: { findFirst: vi.fn(), create: vi.fn() },
    learningPlan: { deleteMany: vi.fn(), create: vi.fn() },
    resumeReview: { deleteMany: vi.fn(), create: vi.fn() },
    interviewSession: { findUnique: findInterviewSession },
    interviewAnswer: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/ai/rate-limit", () => ({ enforceAiRateLimit }));

function request(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeInterviewSession(scored: boolean) {
  return {
    id: "interview-a",
    userId: "user-a",
    targetRole: "Developer",
    status: scored ? "completed" : "in_progress",
    currentQuestionIndex: 0,
    answers: Array.from({ length: 5 }, (_, questionIndex) => ({
      id: `answer-${questionIndex}`,
      questionIndex,
      questionType: questionIndex === 4 ? "behavioral" : "technical",
      questionText: `Explain concept number ${questionIndex} clearly.`,
      userAnswer: scored ? "A complete stored answer." : null,
      score: scored ? 6 : null,
      feedback: null,
      sampleAnswer: null,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({
    data: { user: { id: "user-a", email: "user@example.com", user_metadata: {} } },
    error: null,
  });
  enforceAiRateLimit.mockResolvedValue(
    NextResponse.json(
      { error: "AI usage limit exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } }
    )
  );
});

describe("AI route quota integration", () => {
  it.each([
    ["gap detector", gapDetector, "/api/gap-detector", { targetRole: "Developer", currentSkills: [] }],
    ["learning plan", learningPlan, "/api/learning-plan", { durationWeeks: 4 }],
    ["resume checker", resumeChecker, "/api/resume-checker", { targetRole: "Developer", resumeText: "A sufficiently long resume for validation." }],
    ["interview start", interviewStart, "/api/interview/start", { targetRole: "Developer" }],
    ["interview answer", interviewAnswer, "/api/interview/answer", { interviewSessionId: "interview-a", questionIndex: 0, userAnswer: "A valid detailed answer." }],
    ["interview summary", interviewSummary, "/api/interview/summary", { interviewSessionId: "interview-a" }],
  ])("returns 429 with Retry-After from %s", async (_name, handler, path, body) => {
    if (path === "/api/interview/answer") {
      findInterviewSession.mockResolvedValue(makeInterviewSession(false));
    } else if (path === "/api/interview/summary") {
      findInterviewSession.mockResolvedValue(makeInterviewSession(true));
    }

    const response = await handler(request(path, body));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(enforceAiRateLimit).toHaveBeenCalledWith("user-a");
  });

  it("does not reserve quota for an invalid request", async () => {
    const response = await gapDetector(
      request("/api/gap-detector", { targetRole: "x", currentSkills: [] })
    );

    expect(response.status).toBe(400);
    expect(enforceAiRateLimit).not.toHaveBeenCalled();
    expect(prisma.profile.upsert).not.toHaveBeenCalled();
  });
});
