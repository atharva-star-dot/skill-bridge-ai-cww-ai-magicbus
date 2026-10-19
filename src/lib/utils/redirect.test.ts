import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./redirect";

const origin = "https://skillbridge.example";

describe("getSafeRedirectPath", () => {
  it.each([
    "/dashboard",
    "/learning-plan?week=2",
    "/onboarding#skills",
  ])("accepts safe relative path %s", (path) => {
    expect(getSafeRedirectPath(path, origin)).toBe(path);
  });

  it.each([
    "@evil.com",
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "/%2fevil.com",
    "/%252fevil.com",
    " /dashboard",
    "/dashboard\n",
    "/%0d%0aLocation:%20https://evil.com",
  ])("rejects unsafe path %s", (path) => {
    expect(getSafeRedirectPath(path, origin)).toBeNull();
  });

  it("rejects malformed percent encoding", () => {
    expect(getSafeRedirectPath("/%zz", origin)).toBeNull();
  });
});
