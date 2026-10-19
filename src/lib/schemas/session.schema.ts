import { z } from "zod";

export const SessionUpdateSchema = z.object({
  sessionId: z.string().optional(),
  targetRole: z.string().min(2).max(100).optional(),
  currentSkills: z.array(z.string().min(1).max(60)).max(50).optional(),
  readinessScore: z.number().int().min(0).max(100).optional(),
});

export type SessionUpdate = z.infer<typeof SessionUpdateSchema>;
