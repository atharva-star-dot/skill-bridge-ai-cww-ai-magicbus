import { z } from 'zod';

export const MissingKeywordItemSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required'),
  priority: z.enum(['High', 'Medium', 'Low']),
  whereToAdd: z.string().min(5, 'Guidance on where to place keyword required'),
});

export const BulletRewriteItemSchema = z.object({
  original: z.string().min(5, 'Original bullet point must be at least 5 characters'),
  improved: z.string().min(10, 'Improved bullet point must be at least 10 characters'),
  why: z.string().min(10, 'Explanation of improvement required'),
});

export const SectionChecksSchema = z.object({
  contact: z.boolean(),
  summary: z.boolean(),
  skills: z.boolean(),
  experience: z.boolean(),
  projects: z.boolean(),
  education: z.boolean(),
});

export const ResumeReviewInputSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  resumeText: z.string().min(20, 'Resume text must be at least 20 characters').max(15000, 'Resume text exceeds 15,000 characters limit'),
  targetRole: z.string().min(2, 'Target role is required'),
});

export const ResumeReviewOutputSchema = z.object({
  atsScore: z.number().int().min(0).max(100),
  targetRole: z.string(),
  summary: z.string().min(10, 'Diagnostic summary required'),
  strengths: z.array(z.string()).min(1, 'At least 1 strength required'),
  weaknesses: z.array(z.string()).min(1, 'At least 1 weakness required'),
  missingKeywords: z.array(MissingKeywordItemSchema),
  bulletRewrites: z.array(BulletRewriteItemSchema).length(5, 'Exactly 5 bullet rewrites are required'),
  sectionChecks: SectionChecksSchema,
  source: z.enum(['ai', 'fallback']).optional(),
});

export type MissingKeywordItem = z.infer<typeof MissingKeywordItemSchema>;
export type BulletRewriteItem = z.infer<typeof BulletRewriteItemSchema>;
export type SectionChecks = z.infer<typeof SectionChecksSchema>;
export type ResumeReviewInput = z.infer<typeof ResumeReviewInputSchema>;
export type ResumeReviewOutput = z.infer<typeof ResumeReviewOutputSchema>;
