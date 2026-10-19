import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildTestEmailWhere,
  matchesTestEmailDomain,
  parseTestEmailDomain,
} from "./cleanup-test-sessions-utils";

const scriptPath = fileURLToPath(
  new URL("./cleanup-test-sessions.ts", import.meta.url)
);
const script = readFileSync(scriptPath, "utf8");

describe("test-session cleanup domain safeguards", () => {
  it("fails closed when TEST_EMAIL_DOMAIN is missing or invalid", () => {
    expect(() => parseTestEmailDomain(undefined)).toThrow(/TEST_EMAIL_DOMAIN/i);
    expect(() => parseTestEmailDomain("@example.test")).toThrow(/domain/i);
  });

  it("matches only email addresses ending in the exact configured domain", () => {
    expect(matchesTestEmailDomain("User@Example.Test", "example.test")).toBe(true);
    expect(matchesTestEmailDomain("user@notexample.test", "example.test")).toBe(false);
    expect(matchesTestEmailDomain("user@example.test.attacker", "example.test")).toBe(false);
    expect(matchesTestEmailDomain("test-user@example.com", "example.test")).toBe(false);
  });

  it("builds an exact domain-suffix query and uses it in the cleanup script", () => {
    expect(buildTestEmailWhere("example.test")).toEqual({
      email: { endsWith: "@example.test", mode: "insensitive" },
    });
    expect(script).toContain("buildTestEmailWhere");
    expect(script).not.toMatch(/contains:\s*['"]test['"]/i);
    expect(script).not.toContain("startsWith: 'test-'");
  });
});
