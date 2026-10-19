import { describe, expect, it } from "vitest";
import { computeReadiness } from "./compute-readiness";

describe("computeReadiness", () => {
  it("returns 98 when all benchmark skills are matched", () => {
    expect(
      computeReadiness({
        benchmark: { requiredSkills: ["React"], goodToHaveSkills: ["Docker"] },
        matchedSkills: ["React", "Docker"],
      })
    ).toBe(98);
  });

  it("returns the floor of 10 when no benchmark skills are matched", () => {
    expect(
      computeReadiness({
        benchmark: { requiredSkills: ["React"], goodToHaveSkills: ["Docker"] },
        matchedSkills: [],
      })
    ).toBe(10);
  });

  it("weights required skills High and good-to-have skills Medium by default", () => {
    expect(
      computeReadiness({
        benchmark: { requiredSkills: ["React"], goodToHaveSkills: ["Docker"] },
        matchedSkills: ["React"],
      })
    ).toBe(63);
  });

  it("uses explicit AI priority overrides for matched and missing benchmark skills", () => {
    expect(
      computeReadiness({
        benchmark: { requiredSkills: ["Core"], goodToHaveSkills: ["Optional"] },
        matchedSkills: ["Core"],
        missingSkills: [
          { name: "Core", priority: "Low" },
          { name: "Optional", priority: "High" },
        ],
      })
    ).toBe(32);
  });

  it("uses weighted task progress to advance readiness toward 98", () => {
    expect(
      computeReadiness({
        benchmark: { requiredSkills: ["A", "B"], goodToHaveSkills: [] },
        matchedSkills: ["A"],
        taskProgress: { completedWeight: 2, totalWeight: 4 },
      })
    ).toBe(76);
  });

  it("clamps readiness to 10–98 when task progress values exceed their bounds", () => {
    const input = {
      benchmark: { requiredSkills: ["A"], goodToHaveSkills: [] },
      matchedSkills: [],
    };
    expect(
      computeReadiness({
        ...input,
        taskProgress: { completedWeight: -1, totalWeight: 4 },
      })
    ).toBe(10);
    expect(
      computeReadiness({
        ...input,
        taskProgress: { completedWeight: 5, totalWeight: 4 },
      })
    ).toBe(98);
  });
});
