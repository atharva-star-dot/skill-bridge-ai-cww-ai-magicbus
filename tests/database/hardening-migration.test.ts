import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL("../../supabase/04_hardening.sql", import.meta.url));
const migration = readFileSync(migrationPath, "utf8");
const runnerPath = fileURLToPath(new URL("../../supabase/00_RUN_ALL.sql", import.meta.url));
const runner = readFileSync(runnerPath, "utf8");

describe("Supabase hardening migration safeguards", () => {
  it("backfills missing profiles without overwriting existing profile data", () => {
    expect(migration).toMatch(/INSERT INTO public\.profiles[\s\S]+?FROM auth\.users/i);
    expect(migration).toMatch(/ON CONFLICT\s*\(id\)\s*DO NOTHING/i);
  });

  it("validates orphan rows before installing profile foreign keys", () => {
    const orphanCheck = migration.indexOf("orphaned user rows");
    const foreignKeyChange = migration.indexOf("FOREIGN KEY (user_id)");
    expect(orphanCheck).toBeGreaterThanOrEqual(0);
    expect(foreignKeyChange).toBeGreaterThan(orphanCheck);
    expect(migration).toMatch(/RAISE EXCEPTION/i);
  });

  it("stops on duplicate interview answers without deleting or merging data", () => {
    const duplicateCheck = migration.indexOf("duplicate interview answers");
    const uniqueIndex = migration.indexOf("CREATE UNIQUE INDEX");
    expect(duplicateCheck).toBeGreaterThanOrEqual(0);
    expect(uniqueIndex).toBeGreaterThan(duplicateCheck);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.(skill_gap_reports|learning_plans|resume_reviews|interview_answers)/i);
  });

  it("is transaction-wrapped and appended to the combined SQL runner", () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/i);
    expect(migration.trimEnd()).toMatch(/COMMIT;$/i);
    expect(runner).toContain(migration.trim());
  });
});
