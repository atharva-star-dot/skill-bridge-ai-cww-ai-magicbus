import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readSql(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const schema = readSql("../../supabase/01_schema.sql");
const runner = readSql("../../supabase/00_RUN_ALL.sql");
const migration = readSql("../../supabase/04_hardening.sql");
const rlsPolicies = readSql("../../supabase/05_rls_policies.sql");

describe("Supabase schema runner error handling", () => {
  it("does not suppress SQL errors in the core schema", () => {
    expect(schema).not.toMatch(/EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+NULL/i);
    expect(runner).not.toMatch(/EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+NULL/i);
    expect(schema).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  it("keeps schema setup, hardening, and RLS policies in the idempotent runner", () => {
    expect(runner).toContain("01_schema.sql");
    expect(runner).toContain(migration.trim());
    expect(runner.trimEnd().endsWith(rlsPolicies.trim())).toBe(true);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_usage/i);
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS/i);
    expect(migration).not.toMatch(/EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+NULL/i);
  });
});
