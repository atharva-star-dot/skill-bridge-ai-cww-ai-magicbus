import { describe, expect, it } from "vitest";
import {
  normalizeSkill,
  skillsMatch,
  textContainsSkill,
} from "./skill-matching";

describe("skill matching", () => {
  it("normalizes case, surrounding whitespace, and punctuation spacing", () => {
    expect(normalizeSkill("  Node . JS  ")).toBe("node.js");
    expect(skillsMatch("  React  ", "react")).toBe(true);
  });

  it("matches only exact normalized skill names", () => {
    expect(skillsMatch("java", "javascript")).toBe(false);
    expect(skillsMatch("c", "React")).toBe(false);
  });

  it("supports the approved JavaScript and Node aliases", () => {
    expect(skillsMatch("js", "JavaScript")).toBe(true);
    expect(skillsMatch("node", "Node.js")).toBe(true);
  });

  it("matches skill names as whole terms within task text", () => {
    expect(textContainsSkill("Build a JavaScript app", "java")).toBe(false);
    expect(textContainsSkill("Practice C fundamentals", "c")).toBe(true);
    expect(textContainsSkill("Build a React Native app", "React")).toBe(true);
  });
});
