import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { exchangeCodeForSession, findUnique } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { exchangeCodeForSession },
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: { profile: { findUnique } },
}));

describe("GET /auth/callback redirect validation", () => {
  it.each(["@evil.com", "//evil.com", "https://evil.com", "/%252fevil.com"])(
    "falls back to dashboard for %s",
    async (next) => {
      exchangeCodeForSession.mockResolvedValue({
        data: { user: { id: "user-a" } },
        error: null,
      });
      findUnique.mockResolvedValue({ targetRole: "Developer" });

      const response = await GET(
        new Request(`https://skillbridge.example/auth/callback?code=ok&next=${encodeURIComponent(next)}`)
      );

      expect(response.headers.get("location")).toBe("https://skillbridge.example/dashboard");
    }
  );

  it("allows a safe same-origin path", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    findUnique.mockResolvedValue({ targetRole: "Developer" });

    const response = await GET(
      new Request("https://skillbridge.example/auth/callback?code=ok&next=%2Flearning-plan")
    );

    expect(response.headers.get("location")).toBe("https://skillbridge.example/learning-plan");
  });
});
