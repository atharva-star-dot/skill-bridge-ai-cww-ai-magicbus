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
    skillGapReport: { create: vi.fn() },
  },
}));

vi.mock("@/lib/ai/gemini", () => ({
  executeGeminiWithRetry,
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "");
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/gap-detector error handling", () => {
  it("returns a generic error without logging user data or raw errors", async () => {
    const secret = "private resume content";
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getUser.mockRejectedValue(new Error(secret));

    const response = await POST(
      new NextRequest("http://localhost/api/gap-detector", {
        method: "POST",
        body: JSON.stringify({
          targetRole: "Developer",
          currentSkills: [],
          resumeText: secret,
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "An unexpected error occurred during skill gap analysis.",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
    log.mockRestore();
  });

  it("returns persisted true when the profile and report save succeeds", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    getUser.mockResolvedValue({
      data: { user: { id: "user-a", email: "user@example.com", user_metadata: {} } },
      error: null,
    });
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.skillGapReport.create).mockResolvedValue({} as never);

    const response = await POST(
      new NextRequest("http://localhost/api/gap-detector", {
        method: "POST",
        body: JSON.stringify({ targetRole: "Developer", currentSkills: [] }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ persisted: true, source: "fallback" });
  });

  it("returns the generated report with persisted false when its save fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    getUser.mockResolvedValue({
      data: { user: { id: "user-a", email: "user@example.com", user_metadata: {} } },
      error: null,
    });
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.skillGapReport.create).mockRejectedValue(new Error("private database detail"));
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await POST(
      new NextRequest("http://localhost/api/gap-detector", {
        method: "POST",
        body: JSON.stringify({ targetRole: "Developer", currentSkills: [] }),
      })
    );
    const report = await response.json();

    expect(response.status).toBe(200);
    expect(report).toMatchObject({ targetRole: "Developer", source: "fallback", persisted: false });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private database detail");
    log.mockRestore();
  });

  it("keeps the readiness score within 0–100 when the AI score is out of range", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    getUser.mockResolvedValue({
      data: { user: { id: "user-a", email: "user@example.com", user_metadata: {} } },
      error: null,
    });
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.skillGapReport.create).mockResolvedValue({} as never);
    executeGeminiWithRetry.mockResolvedValue({
      targetRole: "Developer",
      readinessScore: 150,
      requiredSkills: ["React"],
      matchedSkills: ["React"],
      missingSkills: [],
      summary: "The candidate matches the available benchmark skills.",
      source: "ai",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/gap-detector", {
        method: "POST",
        body: JSON.stringify({ targetRole: "Developer", currentSkills: ["React"] }),
      })
    );
    const report = await response.json();

    expect(response.status).toBe(200);
    expect(report.readinessScore).toBeGreaterThanOrEqual(0);
    expect(report.readinessScore).toBeLessThanOrEqual(100);
  });

  it("returns the deterministic fallback contract when Gemini fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    getUser.mockResolvedValue({
      data: { user: { id: "user-a", email: "user@example.com", user_metadata: {} } },
      error: null,
    });
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.skillGapReport.create).mockResolvedValue({} as never);
    executeGeminiWithRetry.mockRejectedValue(new Error("Gemini overall deadline exceeded"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await POST(
      new NextRequest("http://localhost/api/gap-detector", {
        method: "POST",
        body: JSON.stringify({ targetRole: "Developer", currentSkills: [] }),
      })
    );
    const report = await response.json();

    expect(response.status).toBe(200);
    expect(report).toMatchObject({
      targetRole: "Developer",
      source: "fallback",
      persisted: true,
    });
    warning.mockRestore();
  });
});
