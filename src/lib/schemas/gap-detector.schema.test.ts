import { describe, expect, it } from "vitest";
import { GapDetectorInputSchema } from "./gap-detector.schema";

const validInput = { targetRole: "Developer", currentSkills: [] };

describe("GapDetectorInputSchema skill limits", () => {
  it("accepts 50 skills of up to 60 characters", () => {
    expect(
      GapDetectorInputSchema.safeParse({
        ...validInput,
        currentSkills: ["a".repeat(60), ...Array.from({ length: 49 }, () => "Skill")],
      }).success
    ).toBe(true);
  });

  it("rejects more than 50 skills, skills over 60 characters, and empty skills", () => {
    expect(
      GapDetectorInputSchema.safeParse({
        ...validInput,
        currentSkills: Array.from({ length: 51 }, () => "Skill"),
      }).success
    ).toBe(false);
    expect(
      GapDetectorInputSchema.safeParse({
        ...validInput,
        currentSkills: ["a".repeat(61)],
      }).success
    ).toBe(false);
    expect(
      GapDetectorInputSchema.safeParse({
        ...validInput,
        currentSkills: [""],
      }).success
    ).toBe(false);
  });
});
