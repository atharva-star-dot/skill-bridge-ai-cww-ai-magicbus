import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const { getUser, findProfile, findSession } = vi.hoisted(() => ({
  getUser: vi.fn(),
  findProfile: vi.fn(),
  findSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: { findUnique: findProfile },
    interviewSession: { findFirst: findSession },
  },
}));

function createCompletedSession(scores: Array<number | null>) {
  return {
    id: "session-a",
    targetRole: "Developer",
    status: "completed",
    currentQuestionIndex: 5,
    summary: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    answers: scores.map((score, questionIndex) => ({
      id: `answer-${questionIndex}`,
      questionIndex,
      questionType: questionIndex === 4 ? "behavioral" : "technical",
      questionText: `Question ${questionIndex}`,
      userAnswer: "Answer",
      score,
      feedback: null,
      sampleAnswer: null,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({
    data: { user: { id: "user-a" } },
    error: null,
  });
  findProfile.mockResolvedValue({ targetRole: "Developer" });
});

describe("GET /api/interview/active completion state", () => {
  it("does not report a completed session when any question score is missing", async () => {
    findSession.mockResolvedValueOnce(null).mockResolvedValueOnce(
      createCompletedSession([4, 6, 8, 5, null])
    );

    const response = await GET(new NextRequest("http://localhost/api/interview/active"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.latestCompletedSession).toBeNull();
  });

  it("reports completion only after five ordered answers have scores", async () => {
    findSession.mockResolvedValueOnce(null).mockResolvedValueOnce(
      createCompletedSession([4, 6, 8, 5, 7])
    );

    const response = await GET(new NextRequest("http://localhost/api/interview/active"));
    const payload = await response.json();

    expect(payload.latestCompletedSession).toMatchObject({
      status: "completed",
      questions: [
        { questionIndex: 0, score: 4 },
        { questionIndex: 1, score: 6 },
        { questionIndex: 2, score: 8 },
        { questionIndex: 3, score: 5 },
        { questionIndex: 4, score: 7 },
      ],
    });
  });
});
