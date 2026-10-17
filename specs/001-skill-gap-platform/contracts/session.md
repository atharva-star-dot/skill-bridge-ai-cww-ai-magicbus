# Contract: Guest Session Management API

**Endpoint**: `/api/session`
**Purpose**: Syncs guest profile state, selected target role, verified skills, and overall readiness between browser storage and the server-side database.

---

## 1. Get Session Data

**Method**: `GET /api/session?sessionId={uuid}`

**Response (200 OK)**:
```typescript
import { z } from 'zod';

export const SessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  targetRole: z.string().nullable(),
  currentSkills: z.array(z.string()),
  readinessScore: z.number().int().min(0).max(100),
  activePlanSummary: z.object({
    id: z.string().uuid(),
    durationWeeks: z.number(),
    completedTasksCount: z.number(),
    totalTasksCount: z.number(),
  }).nullable(),
  updatedAt: z.string(),
});
```

---

## 2. Sync / Update Session State

**Method**: `POST /api/session`

**Request Body Schema**:
```typescript
import { z } from 'zod';

export const SessionUpdateRequestSchema = z.object({
  sessionId: z.string().uuid(),
  targetRole: z.string().min(2).max(100).optional(),
  currentSkills: z.array(z.string()).optional(),
  readinessScore: z.number().int().min(0).max(100).optional(),
  completedTaskIds: z.array(z.string()).optional(),
});
```

**Response (200 OK)**:
```json
{
  "success": true,
  "sessionId": "a8098c1a-f86e-11da-bd1a-00112444be1e",
  "updatedAt": "2026-10-17T11:15:00.000Z"
}
```
