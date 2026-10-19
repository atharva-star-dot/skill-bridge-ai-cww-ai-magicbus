import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { executeGeminiWithRetry, getActiveModel } from "./gemini";

const geminiMock = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getGenerativeModel: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: geminiMock.getGenerativeModel,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "primary-model");
  vi.stubEnv("GEMINI_FALLBACK_MODELS", "backup-one,backup-two");
  geminiMock.getGenerativeModel.mockReturnValue({
    generateContent: geminiMock.generateContent,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("executeGeminiWithRetry", () => {
  it("aborts a hanging request at the overall deadline and clears its timer", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    geminiMock.generateContent.mockImplementation(
      (_prompt: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          requestSignal = options.signal;
          options.signal.addEventListener("abort", () =>
            reject(new Error("request aborted"))
          );
        })
    );

    const execution = executeGeminiWithRetry("prompt", z.object({ ok: z.boolean() }));
    const rejection = expect(execution).rejects.toThrow(/deadline/i);
    await vi.advanceTimersByTimeAsync(22_000);
    await rejection;

    expect(requestSignal?.aborted).toBe(true);
    expect(geminiMock.generateContent).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("tries no more than two models and two attempts per model", async () => {
    vi.useFakeTimers();
    geminiMock.generateContent.mockRejectedValue(new Error("provider failure"));

    const execution = executeGeminiWithRetry("prompt", z.object({ ok: z.boolean() }));
    const rejection = expect(execution).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(2_000);
    await rejection;

    expect(geminiMock.getGenerativeModel).toHaveBeenCalledTimes(2);
    expect(geminiMock.generateContent).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the deadline timer after a successful response", async () => {
    vi.useFakeTimers();
    geminiMock.generateContent.mockResolvedValue({
      response: Promise.resolve({ text: () => '{"ok":true}' }),
    });

    await expect(
      executeGeminiWithRetry("prompt", z.object({ ok: z.boolean() }))
    ).resolves.toEqual({ ok: true });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("prioritizes the configured primary and removes duplicate fallback IDs", async () => {
    vi.stubEnv(
      "GEMINI_FALLBACK_MODELS",
      "backup-one, primary-model, , backup-two"
    );
    geminiMock.generateContent
      .mockRejectedValueOnce(Object.assign(new Error("model not found"), { status: 404 }))
      .mockResolvedValueOnce({
        response: Promise.resolve({ text: () => '{"ok":true}' }),
      });

    await expect(
      executeGeminiWithRetry("prompt", z.object({ ok: z.boolean() }))
    ).resolves.toEqual({ ok: true });

    expect(
      geminiMock.getGenerativeModel.mock.calls.map(([options]) => options.model)
    ).toEqual(["primary-model", "backup-one"]);
  });

  it("uses the default primary and no fallback when configuration values are empty", async () => {
    vi.stubEnv("GEMINI_MODEL", "   ");
    vi.stubEnv("GEMINI_FALLBACK_MODELS", " , , ");
    geminiMock.generateContent.mockResolvedValue({
      response: Promise.resolve({ text: () => '{"ok":true}' }),
    });

    expect(getActiveModel()).toBe("gemini-2.5-flash");
    await executeGeminiWithRetry("prompt", z.object({ ok: z.boolean() }));

    expect(geminiMock.getGenerativeModel).toHaveBeenCalledOnce();
    expect(geminiMock.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-2.5-flash" })
    );
  });

  it("caps a long fallback configuration at two distinct models", async () => {
    vi.stubEnv(
      "GEMINI_FALLBACK_MODELS",
      "backup-one,backup-two,backup-three"
    );
    geminiMock.generateContent.mockRejectedValue(
      Object.assign(new Error("model not found"), { status: 404 })
    );

    await expect(
      executeGeminiWithRetry("prompt", z.object({ ok: z.boolean() }))
    ).rejects.toThrow();

    expect(
      geminiMock.getGenerativeModel.mock.calls.map(([options]) => options.model)
    ).toEqual(["primary-model", "backup-one"]);
  });
});
