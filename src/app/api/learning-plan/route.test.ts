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
    profile: { findUnique: vi.fn() },
    skillGapReport: { findFirst: vi.fn() },
    learningPlan: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/ai/gemini", () => ({
  executeGeminiWithRetry,
  getActiveModel: () => "test-model",
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  getUser.mockResolvedValue({
    data: { user: { id: "user-a", email: "user@example.com", user_metadata: {} } },
    error: null,
  });
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    id: "user-a",
    targetRole: "Developer",
  } as never);
  vi.mocked(prisma.skillGapReport.findFirst).mockResolvedValue({
    targetRole: "Developer",
    missingSkills: JSON.stringify([
      {
        name: "TypeScript",
        priority: "High",
        reason: "Used in modern projects.",
        category: "Core Technical",
      },
    ]),
    matchedSkills: JSON.stringify(["JavaScript"]),
  } as never);
  vi.mocked(prisma.learningPlan.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.learningPlan.create).mockResolvedValue({
    id: "plan-a",
    tasks: [],
  } as never);
  executeGeminiWithRetry.mockRejectedValue(new Error("Gemini overall deadline exceeded"));
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/learning-plan fallback", () => {
  it("returns the deterministic fallback and retains the response contract after AI failure", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await POST(
      new NextRequest("http://localhost/api/learning-plan", {
        method: "POST",
        body: JSON.stringify({ durationWeeks: 2 }),
      })
    );
    const plan = await response.json();

    expect(response.status).toBe(200);
    expect(plan).toMatchObject({
      targetRole: "Developer",
      durationWeeks: 2,
      source: "fallback",
      planId: "plan-a",
      weeks: expect.any(Array),
      overallGoal: expect.any(String),
    });
    expect(plan.weeks[0].tasks[0]).toMatchObject({
      taskId: null,
      isCompleted: false,
    });
    warning.mockRestore();
  });
});
