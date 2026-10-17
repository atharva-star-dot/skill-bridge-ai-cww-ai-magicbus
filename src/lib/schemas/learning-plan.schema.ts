import { z } from 'zod';

// ── Resource attached to a task ────────────────────────────────────────────
export const LearningResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url('Resource URL must be a valid URL'),
  type: z.enum(['article', 'video', 'course', 'docs', 'practice', 'book']),
});

// ── A single task inside a week ────────────────────────────────────────────
export const PlanTaskItemSchema = z.object({
  title: z.string().min(3, 'Task title required'),
  description: z.string().min(10, 'Task description required'),
  estimatedHours: z.number().min(0.5).max(40),
  skillsCovered: z.array(z.string()).min(1),
  resources: z.array(LearningResourceSchema).max(4),
});

// ── One week block in the roadmap ─────────────────────────────────────────
export const WeekPlanSchema = z.object({
  weekNumber: z.number().int().min(1),
  theme: z.string().min(3, 'Week theme required'),          // e.g. "TypeScript Foundations"
  focusSkills: z.array(z.string()).min(1),
  tasks: z.array(PlanTaskItemSchema).min(1).max(6),
  miniProject: z.string().min(10, 'Mini project description required'),
});

// ── Full learning plan output ─────────────────────────────────────────────
export const LearningPlanOutputSchema = z.object({
  targetRole: z.string(),
  durationWeeks: z.number().int().min(2).max(8),
  weeks: z.array(WeekPlanSchema).min(1),
  overallGoal: z.string().min(10),
  /** Which analysis path ran: "ai" = Gemini API, "fallback" = rule-based */
  source: z.enum(['ai', 'fallback']).optional(),
});

// ── API input schema ───────────────────────────────────────────────────────
export const LearningPlanInputSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  durationWeeks: z.union([z.literal(2), z.literal(4), z.literal(8)]).default(4),
});

// ── Types ──────────────────────────────────────────────────────────────────
export type LearningResource = z.infer<typeof LearningResourceSchema>;
export type PlanTaskItem = z.infer<typeof PlanTaskItemSchema>;
export type WeekPlan = z.infer<typeof WeekPlanSchema>;
export type LearningPlanOutput = z.infer<typeof LearningPlanOutputSchema>;
export type LearningPlanInput = z.infer<typeof LearningPlanInputSchema>;
