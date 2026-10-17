# Contract: Personal Learning Plan API

**Endpoint**: `POST /api/learning-plan`
**Purpose**: Generates a week-by-week personalized learning plan based on missing skills and chosen duration.

---

## Request

**Headers**:
`Content-Type: application/json`

**Body Schema (Zod)**:
```typescript
import { z } from 'zod';

export const LearningPlanRequestSchema = z.object({
  sessionId: z.string().uuid(),
  targetRole: z.string().min(2).max(100),
  missingSkills: z.array(z.string().min(1)).min(1),
  durationWeeks: z.union([z.literal(2), z.literal(4), z.literal(8)]).default(4),
});

export type LearningPlanRequest = z.infer<typeof LearningPlanRequestSchema>;
```

**Example Request**:
```json
{
  "sessionId": "a8098c1a-f86e-11da-bd1a-00112444be1e",
  "targetRole": "Junior Frontend Developer",
  "missingSkills": ["TypeScript", "Tailwind CSS", "Git"],
  "durationWeeks": 4
}
```

---

## Response

**Status**: `200 OK`

**Body Schema (Zod)**:
```typescript
import { z } from 'zod';

export const PlanTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number().positive(),
  isCompleted: z.boolean().default(false),
});

export const LearningResourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  type: z.enum(['Article', 'Video', 'Docs', 'Course']),
  isFree: z.boolean().default(true),
});

export const MiniProjectSchema = z.object({
  title: z.string(),
  description: z.string(),
  deliverables: z.array(z.string()),
});

export const PlanWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(8),
  theme: z.string(),
  topics: z.array(z.string()),
  tasks: z.array(PlanTaskSchema),
  resources: z.array(LearningResourceSchema),
  miniProject: MiniProjectSchema,
});

export const LearningPlanResponseSchema = z.object({
  id: z.string().uuid(),
  targetRole: z.string(),
  durationWeeks: z.number().int(),
  weeks: z.array(PlanWeekSchema),
  completionPercentage: z.number().min(0).max(100).default(0),
  totalTasksCount: z.number().int(),
});

export type LearningPlanResponse = z.infer<typeof LearningPlanResponseSchema>;
```

**Example Response**:
```json
{
  "id": "e4b52c0a-0193-4e4b-9d2a-1c88126b801a",
  "targetRole": "Junior Frontend Developer",
  "durationWeeks": 4,
  "totalTasksCount": 8,
  "completionPercentage": 0,
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "TypeScript Core Types & Interfaces",
      "topics": ["Primitive types", "Interfaces vs Types", "Function typing", "Union & Literal types"],
      "tasks": [
        {
          "id": "w1-t1",
          "title": "Convert a JavaScript utility function to typed TypeScript",
          "description": "Refactor a shopping cart calculator to use strict interfaces and return types.",
          "estimatedHours": 3,
          "isCompleted": false
        },
        {
          "id": "w1-t2",
          "title": "Implement Generic API Response wrapper",
          "description": "Create a reusable ApiResponse<T> interface with error and success states.",
          "estimatedHours": 2,
          "isCompleted": false
        }
      ],
      "resources": [
        {
          "title": "TypeScript Official Handbook - The Basics",
          "url": "https://www.typescriptlang.org/docs/handbook/2/basic-types.html",
          "type": "Docs",
          "isFree": true
        }
      ],
      "miniProject": {
        "title": "Typed Task Tracker CLI or Mini Widget",
        "description": "Build an in-memory task board strictly typed with TypeScript.",
        "deliverables": ["Strict tsconfig.json", "Typed Task state", "Zero any types"]
      }
    }
  ]
}
```
