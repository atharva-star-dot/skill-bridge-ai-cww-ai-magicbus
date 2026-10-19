import { describe, expect, it } from "vitest";
import { safeJsonParse } from "./safe-json";

describe("safeJsonParse", () => {
  it("parses valid arrays and objects", () => {
    expect(safeJsonParse<string[]>('["TypeScript"]', [])).toEqual(["TypeScript"]);
    expect(safeJsonParse<{ score: number }>('{"score":90}', { score: 0 })).toEqual({
      score: 90,
    });
  });

  it("uses the provided shape-appropriate fallback for malformed JSON", () => {
    expect(safeJsonParse("{", ["fallback"])).toEqual(["fallback"]);
    expect(safeJsonParse("{", { score: 0 })).toEqual({ score: 0 });
    expect(safeJsonParse("{", null)).toBeNull();
    expect(safeJsonParse(null, [])).toEqual([]);
  });
});
