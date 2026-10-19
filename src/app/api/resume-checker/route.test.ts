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
    skillGapReport: { findFirst: vi.fn() },
    resumeReview: { deleteMany: vi.fn(), create: vi.fn() },
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

vi.mock("@/lib/ai/fallbacks/resume-checker.fallback", () => ({
  generateFallbackResumeReview: vi.fn(() => ({
    atsScore: 70,
    targetRole: "Developer",
    summary: "A useful resume summary for testing.",
    strengths: ["Relevant project experience"],
    weaknesses: ["Add measurable outcomes"],
    missingKeywords: [],
    bulletRewrites: Array.from({ length: 5 }, () => ({
      original: "Built a useful feature",
      improved: "Built and shipped a measurable feature",
      why: "It adds a clear impact statement.",
    })),
    sectionChecks: {
      contact: true,
      summary: true,
      skills: true,
      experience: true,
      projects: true,
      education: true,
    },
    source: "fallback",
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "");
  getUser.mockResolvedValue({
    data: { user: { id: "user-a" } },
    error: null,
  });
  vi.mocked(prisma.skillGapReport.findFirst).mockResolvedValue(null);
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/resume-checker error handling", () => {
  it("returns a generic error without logging resume data or raw errors", async () => {
    const secret = "private resume content";
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getUser.mockRejectedValue(new Error(secret));

    const response = await POST(
      new NextRequest("http://localhost/api/resume-checker", {
        method: "POST",
        body: JSON.stringify({ targetRole: "Developer", resumeText: secret }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "An unexpected error occurred during resume review.",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
    log.mockRestore();
  });

  it("replaces a previous review inside one transaction", async () => {
    const previousReviews = [{ id: "previous-review" }];
    const transaction = {
      resumeReview: {
        deleteMany: vi.fn(async () => {
          previousReviews.splice(0);
          return { count: 1 };
        }),
        create: vi.fn(async () => {
          throw new Error("create failed");
        }),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (operation) => {
      const snapshot = previousReviews.slice();
      if (typeof operation !== "function") throw new Error("Expected interactive transaction");
      try {
        return await operation(transaction as never);
      } catch (error) {
        previousReviews.splice(0, previousReviews.length, ...snapshot);
        throw error;
      }
    });

    const response = await POST(
      new NextRequest("http://localhost/api/resume-checker", {
        method: "POST",
        body: JSON.stringify({
          targetRole: "Developer",
          resumeText: "A long enough resume input for the checker.",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(previousReviews).toEqual([{ id: "previous-review" }]);
    expect(transaction.resumeReview.deleteMany).toHaveBeenCalledOnce();
    expect(transaction.resumeReview.create).toHaveBeenCalledOnce();
  });

  it("returns the deterministic fallback with the existing response shape", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/resume-checker", {
        method: "POST",
        body: JSON.stringify({
          targetRole: "Developer",
          resumeText: "A long enough resume input for the checker.",
        }),
      })
    );
    const output = await response.json();

    expect(response.status).toBe(200);
    expect(output).toMatchObject({
      atsScore: 70,
      targetRole: "Developer",
      source: "fallback",
      sectionChecks: expect.any(Object),
      bulletRewrites: expect.any(Array),
    });
  });

  it("clamps the AI ATS score to the supported 0–100 range", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    executeGeminiWithRetry.mockResolvedValue({
      atsScore: 135,
      targetRole: "Developer",
      summary: "A useful resume summary for testing.",
      strengths: ["Relevant project experience"],
      weaknesses: ["Add measurable outcomes"],
      missingKeywords: [],
      bulletRewrites: Array.from({ length: 5 }, () => ({
        original: "Built a useful feature",
        improved: "Built and shipped a measurable feature",
        why: "It adds a clear impact statement.",
      })),
      sectionChecks: {
        contact: true,
        summary: true,
        skills: true,
        experience: true,
        projects: true,
        education: true,
      },
      source: "ai",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/resume-checker", {
        method: "POST",
        body: JSON.stringify({
          targetRole: "Developer",
          resumeText: "A long enough resume input for the checker.",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ atsScore: 100 });
  });
});
