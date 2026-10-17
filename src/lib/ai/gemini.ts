import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodSchema } from 'zod';

// Primary model is controlled by GEMINI_MODEL env var.
// Default: gemini-2.5-flash (confirmed working — see scripts/probe-gemini.ts).
// Fallback chain: try the configured primary, then the backup candidates.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BACKUP_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
const CANDIDATE_MODELS = [PRIMARY_MODEL, ...BACKUP_MODELS.filter((m) => m !== PRIMARY_MODEL)];

export function getActiveModel(): string {
  return PRIMARY_MODEL;
}

export async function executeGeminiWithRetry<T>(
  prompt: string,
  schema: ZodSchema<T>,
  systemInstruction?: string,
  maxRetries: number = 3
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured in environment variables (.env.local)');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const delays = [600, 1500, 3000];
  let lastError: unknown;

  for (const modelName of CANDIDATE_MODELS) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction:
        systemInstruction ||
        'You are an expert technical career coach. Always return strictly valid JSON matching the schema requested.',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out after 20000ms')), 20000)
        );

        const result = (await Promise.race([
          model.generateContent(prompt),
          timeoutPromise,
        ])) as any;
        const response = await result.response;
        let rawText = response.text() || '';

        // Strip potential markdown code fences: ```json ... ```
        rawText = rawText.trim();
        if (rawText.startsWith('```json')) rawText = rawText.slice(7);
        else if (rawText.startsWith('```')) rawText = rawText.slice(3);
        if (rawText.endsWith('```')) rawText = rawText.slice(0, -3);
        rawText = rawText.trim();

        const parsedJson = JSON.parse(rawText);
        const validationResult = schema.safeParse(parsedJson);

        if (!validationResult.success) {
          console.error(`[Gemini] Zod validation failed (${modelName}):`, validationResult.error.format());
          throw new Error(`AI JSON does not match schema: ${validationResult.error.message}`);
        }

        console.info(`[Gemini] ✓ Success with model: ${modelName} (attempt ${attempt + 1})`);
        return validationResult.data;
      } catch (err: any) {
        lastError = err;
        const errorMessage = err?.message || '';
        const isNotFound =
          err?.status === 404 ||
          errorMessage.includes('404') ||
          errorMessage.toLowerCase().includes('not found') ||
          errorMessage.toLowerCase().includes('no longer available');
        const isRateLimit =
          err?.status === 429 || errorMessage.includes('429') || errorMessage.includes('ResourceExhausted');
        const isTransient =
          err?.status >= 500 || errorMessage.includes('fetch failed') || errorMessage.includes('overloaded');

        if (isNotFound) {
          console.warn(`[Gemini] Model ${modelName} not available, trying next candidate…`);
          break; // try next candidate model
        }

        if ((isRateLimit || isTransient) && attempt < maxRetries - 1) {
          console.warn(`[Gemini] ${modelName} attempt ${attempt + 1} transient error. Retrying in ${delays[attempt]}ms…`);
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`Gemini AI execution failed across all candidate models: ${(lastError as Error)?.message}`);
}
