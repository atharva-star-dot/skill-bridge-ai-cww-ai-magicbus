import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodSchema } from 'zod';

const CANDIDATE_MODELS = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash'];

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
        'You are an expert technical career coach and skills analyzer. Always return strictly valid JSON matching the schema requested.',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let rawText = response.text() || '';

        // Strip potential markdown code fences: ```json ... ```
        rawText = rawText.trim();
        if (rawText.startsWith('```json')) {
          rawText = rawText.slice(7);
        } else if (rawText.startsWith('```')) {
          rawText = rawText.slice(3);
        }
        if (rawText.endsWith('```')) {
          rawText = rawText.slice(0, -3);
        }
        rawText = rawText.trim();

        const parsedJson = JSON.parse(rawText);
        const validationResult = schema.safeParse(parsedJson);

        if (!validationResult.success) {
          console.error('Zod Validation Failure:', validationResult.error.format());
          throw new Error(`AI generated JSON does not match expected schema: ${validationResult.error.message}`);
        }

        return validationResult.data;
      } catch (err: any) {
        lastError = err;
        const errorMessage = err?.message || '';
        const isNotFound = err?.status === 404 || errorMessage.includes('404') || errorMessage.includes('not found');
        const isRateLimit = err?.status === 429 || errorMessage.includes('429') || errorMessage.includes('ResourceExhausted');
        const isTransient = err?.status >= 500 || errorMessage.includes('fetch failed') || errorMessage.includes('overloaded');

        if (isNotFound) {
          // Model name not found on this API key/region, break to try next candidate model
          break;
        }

        if ((isRateLimit || isTransient) && attempt < maxRetries - 1) {
          console.warn(`Model ${modelName} attempt ${attempt + 1} failed (${errorMessage}). Retrying in ${delays[attempt]}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`Gemini AI execution failed across candidate models: ${(lastError as Error)?.message}`);
}
