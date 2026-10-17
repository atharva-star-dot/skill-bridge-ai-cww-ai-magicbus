# Contract: Skill Gap Detector API

**Endpoint**: `POST /api/gap-detector`
**Purpose**: Analyzes a user's skills or resume against a target role to calculate a readiness score and categorize missing skills.

---

## Request

**Headers**:
`Content-Type: application/json`

**Body Schema (Zod)**:
```typescript
import { z } from 'zod';

export const GapDetectorRequestSchema = z.object({
  sessionId: z.string().uuid(),
  targetRole: z.string().min(2).max(100),
  currentSkills: z.array(z.string().min(1)).optional().default([]),
  resumeText: z.string().max(20000).optional(),
});

export type GapDetectorRequest = z.infer<typeof GapDetectorRequestSchema>;
```

**Example Request**:
```json
{
  "sessionId": "a8098c1a-f86e-11da-bd1a-00112444be1e",
  "targetRole": "Junior Frontend Developer",
  "currentSkills": ["HTML", "CSS", "JavaScript", "React"],
  "resumeText": ""
}
```

---

## Response

**Status**: `200 OK`

**Body Schema (Zod)**:
```typescript
import { z } from 'zod';

export const MissingSkillSchema = z.object({
  name: z.string(),
  priority: z.enum(['High', 'Medium', 'Low']),
  reason: z.string(),
  category: z.enum(['Core Technical', 'Tool / Framework', 'Soft Skill / Workflow']),
});

export const GapDetectorResponseSchema = z.object({
  targetRole: z.string(),
  readinessScore: z.number().int().min(0).max(100),
  requiredSkills: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(MissingSkillSchema),
  extractedResumeSkills: z.array(z.string()).optional(),
  summary: z.string(),
});

export type GapDetectorResponse = z.infer<typeof GapDetectorResponseSchema>;
```

**Example Response**:
```json
{
  "targetRole": "Junior Frontend Developer",
  "readinessScore": 65,
  "requiredSkills": ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Tailwind CSS", "Git"],
  "matchedSkills": ["HTML", "CSS", "JavaScript", "React"],
  "missingSkills": [
    {
      "name": "TypeScript",
      "priority": "High",
      "reason": "Crucial industry standard for production Next.js/React applications.",
      "category": "Core Technical"
    },
    {
      "name": "Tailwind CSS",
      "priority": "Medium",
      "reason": "Most requested utility styling framework in modern job postings.",
      "category": "Tool / Framework"
    },
    {
      "name": "Git",
      "priority": "Low",
      "reason": "Required for team version control and collaborative workflows.",
      "category": "Tool / Framework"
    }
  ],
  "summary": "You have a strong baseline in web fundamentals. Mastering TypeScript and Tailwind will make you highly competitive for entry-level roles."
}
```

---

## Error Responses

- `400 Bad Request`: Validation failure on input parameters (missing role or empty skills/resume).
- `500 Internal Server Error`: AI generation failure or unparseable JSON response. Returns graceful fallback payload:
```json
{
  "error": "Failed to analyze skill gap. Please try again or verify your inputs."
}
```
