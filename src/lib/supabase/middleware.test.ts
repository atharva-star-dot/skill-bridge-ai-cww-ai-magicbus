import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
  })),
}));

afterEach(() => vi.unstubAllEnvs());

describe("Supabase middleware configuration", () => {
  it("fails clearly when required public configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    await expect(
      updateSession(new NextRequest("http://localhost/dashboard"))
    ).rejects.toThrow(/Supabase.*configuration/i);
  });
});
