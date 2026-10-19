import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: queryRaw },
}));

const migrationPath = fileURLToPath(
  new URL("../../supabase/04_hardening.sql", import.meta.url)
);
const migration = readFileSync(migrationPath, "utf8");

function findTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTypeScriptFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => vi.unstubAllEnvs());

describe("Postgres-backed AI usage quota", () => {
  it("allows twenty reservations and rejects the next with database retry timing", async () => {
    let count = 0;
    queryRaw.mockImplementation(async () => {
      if (count >= 20) return [{ allowed: false, retry_after: 41 }];
      count += 1;
      return [{ allowed: true, retry_after: 0 }];
    });

    const results = await Promise.all(
      Array.from({ length: 21 }, () => enforceAiRateLimit("user-a"))
    );

    expect(results.filter((result) => result === null)).toHaveLength(20);
    const limited = results.find((result) => result !== null);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toBe("41");
  });

  it("uses a database-clock rolling window and a per-user transaction lock", () => {
    expect(migration).toMatch(/reserve_ai_usage[\s\S]+?p_limit INTEGER DEFAULT 20/i);
    expect(migration).toMatch(/pg_advisory_xact_lock\(hashtextextended\(p_user_id::TEXT, 0\)\)/i);
    expect(migration).toMatch(/clock_timestamp\(\) - INTERVAL '60 minutes'/i);
    expect(migration).toMatch(/created_at < window_start/i);
    expect(migration).toMatch(/oldest_usage \+ INTERVAL '60 minutes' - clock_timestamp\(\)/i);
  });

  it("routes every quota function call through the shared helper with explicit argument casts", () => {
    const sourceFiles = ["../../src", "../../tests", "../../scripts"].flatMap((directory) =>
      findTypeScriptFiles(fileURLToPath(new URL(directory, import.meta.url)))
    );
    const callSites: Array<{ path: string; call: string }> = [];

    for (const path of sourceFiles) {
      const source = readFileSync(path, "utf8");
      const callPattern = /public\.reserve_ai_usage\s*\([\s\S]*?\)/g;
      for (const match of Array.from(source.matchAll(callPattern))) {
        callSites.push({ path, call: match[0] });
      }
    }

    expect(callSites).toHaveLength(1);
    expect(callSites[0].call).toMatch(
      /public\.reserve_ai_usage\(\s*\$\{userId\}::uuid\s*,\s*\$\{limit\}::integer\s*\)/i
    );
  });

  it("serializes concurrent reservations through the atomic database function", async () => {
    let accepted = 0;
    queryRaw.mockImplementation(async () => {
      await Promise.resolve();
      if (accepted >= 20) return [{ allowed: false, retry_after: 60 }];
      accepted += 1;
      return [{ allowed: true, retry_after: 0 }];
    });

    const results = await Promise.all(
      Array.from({ length: 50 }, () => enforceAiRateLimit("user-a"))
    );

    expect(results.filter((result) => result === null)).toHaveLength(20);
    expect(results.filter((result) => result?.status === 429)).toHaveLength(30);
  });
});
