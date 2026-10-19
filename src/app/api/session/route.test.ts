import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: {
      upsert: vi.fn(),
    },
  },
}));

describe("POST /api/session validation", () => {
  it("rejects invalid fields before writing the profile", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });

    const response = await POST(
      new NextRequest("http://localhost/api/session", {
        method: "POST",
        body: JSON.stringify({
          targetRole: "A",
          currentSkills: ["valid"],
          readinessScore: 101,
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(prisma.profile.upsert).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON as a client error", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/session", {
        method: "POST",
        body: "{",
      })
    );

    expect(response.status).toBe(400);
    expect(prisma.profile.upsert).not.toHaveBeenCalled();
  });

  it("preserves the success response and accepts the legacy sessionId field", async () => {
    const updatedAt = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.profile.upsert).mockResolvedValue({
      id: "user-a",
      targetRole: "Developer",
      updatedAt,
    } as never);
    getUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });

    const response = await POST(
      new NextRequest("http://localhost/api/session", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "legacy-session",
          targetRole: "Developer",
          currentSkills: ["TypeScript"],
          readinessScore: 100,
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      userId: "user-a",
      sessionId: "user-a",
      targetRole: "Developer",
      updatedAt: updatedAt.toISOString(),
    });
  });
});
