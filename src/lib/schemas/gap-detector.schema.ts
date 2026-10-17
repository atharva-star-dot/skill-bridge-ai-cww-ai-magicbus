import { z } from 'zod';

export const MissingSkillItemSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  priority: z.enum(['High', 'Medium', 'Low']),
  reason: z.string().min(5, 'Rationale must be at least 5 characters'),
  category: z.enum(['Core Technical', 'Tool / Framework', 'Soft Skill / Workflow']),
});

export const GapDetectorInputSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  targetRole: z.string().min(2, 'Target role must be at least 2 characters').max(100),
  currentSkills: z.array(z.string()),
  resumeText: z.string().max(25000).optional(),
});

export const GapDetectorOutputSchema = z.object({
  targetRole: z.string(),
  readinessScore: z.number().int().min(0).max(100),
  requiredSkills: z.array(z.string()).min(1, 'At least 1 required skill benchmark is expected'),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(MissingSkillItemSchema),
  extractedResumeSkills: z.array(z.string()).optional(),
  summary: z.string().min(10, 'Diagnostic summary is required'),
  /** Which analysis path ran: "ai" = Gemini API, "fallback" = rule-based benchmark */
  source: z.enum(['ai', 'fallback']).optional(),
});

export type MissingSkillItem = z.infer<typeof MissingSkillItemSchema>;
export type GapDetectorInput = z.infer<typeof GapDetectorInputSchema>;
export type GapDetectorOutput = z.infer<typeof GapDetectorOutputSchema>;
