import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "");
});

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/health", () => {
  it("returns ok status and existing boolean fields when the database is available", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      database: true,
      gemini: false,
    });
  });

  it("logs database diagnostics but exposes no raw error when degraded", async () => {
    const error = new Error("synthetic database diagnostic");
    vi.mocked(prisma.$queryRaw).mockRejectedValue(error);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      status: "degraded",
      database: false,
      gemini: false,
    });
    expect(JSON.stringify(log.mock.calls)).toContain(error.message);
    expect(JSON.stringify(body)).not.toContain(error.message);
    log.mockRestore();
  });
});
