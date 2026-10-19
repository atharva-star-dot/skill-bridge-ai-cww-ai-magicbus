import { describe, expect, it } from "vitest";
import { SessionUpdateSchema } from "./session.schema";

describe("SessionUpdateSchema", () => {
  it("accepts inclusive target-role length boundaries", () => {
    expect(SessionUpdateSchema.safeParse({ targetRole: "AI" }).success).toBe(true);
    expect(SessionUpdateSchema.safeParse({ targetRole: "a".repeat(100) }).success).toBe(true);
  });

  it("rejects target roles outside 2–100 characters", () => {
    expect(SessionUpdateSchema.safeParse({ targetRole: "A" }).success).toBe(false);
    expect(SessionUpdateSchema.safeParse({ targetRole: "a".repeat(101) }).success).toBe(false);
  });

  it("accepts up to 50 skills with at most 60 characters each", () => {
    expect(
      SessionUpdateSchema.safeParse({
        currentSkills: ["a".repeat(60), ...Array.from({ length: 49 }, () => "Skill")],
      }).success
    ).toBe(true);
  });

  it("rejects more than 50 skills and skills longer than 60 characters", () => {
    expect(
      SessionUpdateSchema.safeParse({
        currentSkills: Array.from({ length: 51 }, () => "Skill"),
      }).success
    ).toBe(false);
    expect(SessionUpdateSchema.safeParse({ currentSkills: ["a".repeat(61)] }).success).toBe(false);
  });

  it("accepts readiness scores from 0 through 100 only as integers", () => {
    for (const readinessScore of [0, 100]) {
      expect(SessionUpdateSchema.safeParse({ readinessScore }).success).toBe(true);
    }
    for (const readinessScore of [-1, 101, 20.5]) {
      expect(SessionUpdateSchema.safeParse({ readinessScore }).success).toBe(false);
    }
  });
});
