import { z } from 'zod';

export const QuestionTypeSchema = z.enum(['technical', 'scenario', 'behavioral']);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const InterviewQuestionItemSchema = z.object({
  questionIndex: z.number().int().min(0).max(4),
  questionType: QuestionTypeSchema,
  questionText: z.string().min(10),
  skillTested: z.string().optional(),
});
export type InterviewQuestionItem = z.infer<typeof InterviewQuestionItemSchema>;

export const GenerateQuestionsResponseSchema = z.object({
  questions: z.array(InterviewQuestionItemSchema).length(5),
  source: z.enum(['ai', 'fallback']).default('ai'),
});
export type GenerateQuestionsResponse = z.infer<typeof GenerateQuestionsResponseSchema>;

export const AnswerEvaluationSchema = z.object({
  score: z.number().int().min(1).max(10),
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()).min(1),
  improvedSampleAnswer: z.string().min(30),
  source: z.enum(['ai', 'fallback']).default('ai'),
});
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;

export const PerQuestionScoreItemSchema = z.object({
  questionIndex: z.number().int().min(0).max(4),
  questionType: QuestionTypeSchema,
  questionText: z.string(),
  userAnswer: z.string().nullable(),
  score: z.number().int().min(1).max(10),
  feedback: z.string().optional(),
  sampleAnswer: z.string().optional(),
});
export type PerQuestionScoreItem = z.infer<typeof PerQuestionScoreItemSchema>;

export const InterviewSummarySchema = z.object({
  overallScore: z.number().min(1).max(10), // Calculated deterministically via code average
  perQuestionScores: z.array(PerQuestionScoreItemSchema).min(1).max(5),
  topStrengths: z.array(z.string()).min(1),
  topWeaknesses: z.array(z.string()).min(1),
  recommendedNextSteps: z.array(
    z.object({
      step: z.string(),
      skill: z.string().optional(),
    })
  ).min(1),
  source: z.enum(['ai', 'fallback']).default('ai'),
});
export type InterviewSummary = z.infer<typeof InterviewSummarySchema>;

// Route inputs
export const StartInterviewInputSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  targetRole: z.string().min(2, 'targetRole is required'),
});

export const SubmitAnswerInputSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  interviewSessionId: z.string().min(1, 'interviewSessionId is required'),
  questionIndex: z.number().int().min(0).max(4),
  userAnswer: z.string().min(1, 'Answer is required').max(3000, 'Answer cannot exceed 3,000 characters'),
});

export const GenerateSummaryInputSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  interviewSessionId: z.string().min(1, 'interviewSessionId is required'),
});
