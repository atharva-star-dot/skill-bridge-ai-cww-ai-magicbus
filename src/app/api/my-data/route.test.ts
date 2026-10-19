import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { DELETE, GET } from "./route";

const { getUser, signOut, deleteAuthUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
  deleteAuthUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser, signOut },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser: deleteAuthUser } },
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    skillGapReport: { findMany: vi.fn() },
    learningPlan: { findMany: vi.fn() },
    resumeReview: { findMany: vi.fn() },
    interviewSession: { findMany: vi.fn() },
  },
}));

describe("DELETE /api/my-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    deleteAuthUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("deletes the profile data before deleting the matching Auth user", async () => {
    vi.mocked(prisma.profile.deleteMany).mockResolvedValue({ count: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(prisma.profile.deleteMany).toHaveBeenCalledWith({ where: { id: "user-a" } });
    expect(deleteAuthUser).toHaveBeenCalledWith("user-a");
    expect(vi.mocked(prisma.profile.deleteMany).mock.invocationCallOrder[0]).toBeLessThan(
      deleteAuthUser.mock.invocationCallOrder[0]
    );
  });

  it("returns an error and does not delete Auth when profile deletion fails", async () => {
    vi.mocked(prisma.profile.deleteMany).mockRejectedValue(new Error("database failure"));

    const response = await DELETE();

    expect(response.status).toBe(500);
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it("permits retry after profile cascades succeeded but Auth deletion failed", async () => {
    vi.mocked(prisma.profile.deleteMany).mockResolvedValue({ count: 0 });
    deleteAuthUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "temporary admin failure" },
    });

    const firstResponse = await DELETE();
    const retryResponse = await DELETE();

    expect(firstResponse.status).toBe(500);
    expect(retryResponse.status).toBe(200);
    expect(prisma.profile.deleteMany).toHaveBeenCalledTimes(2);
    expect(deleteAuthUser).toHaveBeenCalledTimes(2);
  });

  it("exports remaining records with safe fallbacks for malformed JSON fields", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      fullName: "Test User",
      targetRole: "Developer",
      currentSkills: "{",
      readinessScore: 50,
    } as never);
    vi.mocked(prisma.skillGapReport.findMany).mockResolvedValue([
      { id: "gap-a", matchedSkills: "{", missingSkills: "[" },
    ] as never);
    vi.mocked(prisma.learningPlan.findMany).mockResolvedValue([
      { id: "plan-a", tasks: [{ id: "task-a", resources: "{" }] },
    ] as never);
    vi.mocked(prisma.resumeReview.findMany).mockResolvedValue([
      {
        id: "resume-a",
        strengths: "{",
        weaknesses: "[",
        missingKeywords: "{",
        bulletRewrites: "not json",
      },
    ] as never);
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([
      {
        id: "interview-a",
        summary: "{",
        answers: [{ id: "answer-a", feedback: "{" }],
      },
    ] as never);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.user.currentSkills).toEqual([]);
    expect(payload.gapReports[0]).toMatchObject({ id: "gap-a", matchedSkills: [], missingSkills: [] });
    expect(payload.learningPlans[0].tasks[0].resources).toEqual([]);
    expect(payload.resumeReviews[0]).toMatchObject({
      id: "resume-a",
      strengths: [],
      weaknesses: [],
      missingKeywords: [],
      bulletRewrites: [],
    });
    expect(payload.interviewSessions[0]).toMatchObject({
      id: "interview-a",
      summary: null,
      answers: [{ id: "answer-a", feedback: null }],
    });
  });
});
