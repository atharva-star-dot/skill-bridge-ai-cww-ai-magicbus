import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "@/lib/utils/redirect";

describe("login redirect destination", () => {
  it("keeps a safe same-origin path", () => {
    expect(getSafeRedirectPath("/learning-plan", "https://skillbridge.example")).toBe(
      "/learning-plan"
    );
  });

  it.each(["@evil.com", "//evil.com", "https://evil.com", "/\\evil.com"])(
    "does not navigate to %s",
    (next) => {
      expect(getSafeRedirectPath(next, "https://skillbridge.example")).toBeNull();
    }
  );
});
