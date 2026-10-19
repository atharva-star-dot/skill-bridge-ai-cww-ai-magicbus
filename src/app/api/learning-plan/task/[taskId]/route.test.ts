import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { PATCH } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    planTask: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    learningPlan: { update: vi.fn() },
    skillGapReport: { findFirst: vi.fn() },
    profile: { update: vi.fn() },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-b" } },
        error: null,
      }),
    },
  }),
}));

const request = () =>
  new NextRequest("http://localhost/api/learning-plan/task/task-a", {
    method: "PATCH",
    body: JSON.stringify({ isCompleted: true }),
  });

describe("PATCH /api/learning-plan/task/[taskId] ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an owned task", async () => {
    const task = {
      id: "task-a",
      planId: "plan-a",
      isCompleted: false,
      plan: { id: "plan-a", userId: "user-b", targetRole: "Developer" },
    };
    vi.mocked(prisma.planTask.findFirst).mockResolvedValue(task as never);
    vi.mocked(prisma.planTask.findMany).mockResolvedValue([
      { isCompleted: true },
    ] as never);
    vi.mocked(prisma.skillGapReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) => {
      if (typeof operation !== "function") throw new Error("Expected interactive transaction");
      return operation(prisma as never);
    });

    const response = await PATCH(request(), { params: { taskId: "task-a" } });

    expect(response.status).toBe(200);
    expect(prisma.planTask.findFirst).toHaveBeenCalledWith({
      where: { id: "task-a", plan: { userId: "user-b" } },
      include: { plan: true },
    });
    expect(prisma.planTask.update).toHaveBeenCalledWith({
      where: { id: "task-a" },
      data: { isCompleted: true },
    });
  });

  it("returns 404 without writing when the task is not owned by the caller", async () => {
    vi.mocked(prisma.planTask.findFirst).mockResolvedValue(null);

    const response = await PATCH(request(), { params: { taskId: "task-a" } });

    expect(response.status).toBe(404);
    expect(prisma.planTask.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 without writing when the task does not exist", async () => {
    vi.mocked(prisma.planTask.findFirst).mockResolvedValue(null);

    const response = await PATCH(request(), { params: { taskId: "missing" } });

    expect(response.status).toBe(404);
    expect(prisma.planTask.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns a generic error and logs no database error details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(prisma.planTask.findFirst).mockRejectedValue(new Error("private task data"));

    const response = await PATCH(request(), { params: { taskId: "task-a" } });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to update task" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private task data");
    log.mockRestore();
  });
});
