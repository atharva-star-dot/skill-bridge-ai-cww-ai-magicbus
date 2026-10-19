import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "./server";

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({})),
}));

afterEach(() => vi.unstubAllEnvs());

describe("server Supabase client configuration", () => {
  it("fails clearly when the public URL or key is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => createClient()).toThrow(/Supabase.*configuration/i);
  });

  it("accepts the configured public URL and anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    expect(() => createClient()).not.toThrow();
  });
});
