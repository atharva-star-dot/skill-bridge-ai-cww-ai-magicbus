# Contract: AI Mock Interview API

**Endpoint**: `POST /api/interview`
**Purpose**: Manages interactive 5-question interview sessions (technical and behavioral) with per-question scoring (1-10) and final summary generation.

---

## Action 1: Start Interview

**Request Body Schema**:
```typescript
import { z } from 'zod';

export const StartInterviewRequestSchema = z.object({
  action: z.literal('start'),
  sessionId: z.string().uuid(),
  targetRole: z.string().min(2).max(100),
});
```

**Response (200 OK)**:
```typescript
export const StartInterviewResponseSchema = z.object({
  interviewId: z.string().uuid(),
  targetRole: z.string(),
  totalQuestions: z.literal(5),
  currentQuestionIndex: z.literal(0),
  firstQuestion: z.object({
    index: z.number().int().min(0).max(4),
    type: z.enum(['technical', 'behavioral']),
    question: z.string(),
  }),
});
```

---

## Action 2: Submit Answer & Evaluate

**Request Body Schema**:
```typescript
export const EvaluateInterviewRequestSchema = z.object({
  action: z.literal('evaluate'),
  interviewId: z.string().uuid(),
  questionIndex: z.number().int().min(0).max(4),
  questionText: z.string(),
  userAnswer: z.string().min(10).max(3000),
  isFinalQuestion: z.boolean(),
});
```

**Response (200 OK)**:
```typescript
export const QuestionFeedbackSchema = z.object({
  score: z.number().int().min(1).max(10),
  feedback: z.string(),
  sampleAnswer: z.string(),
  keyTakeaway: z.string(),
});

export const InterviewSummarySchema = z.object({
  overallRating: z.number().min(1).max(10),
  strengths: z.array(z.string()),
  criticalImprovements: z.array(z.string()),
  readinessVerdict: z.string(),
});

export const EvaluateInterviewResponseSchema = z.object({
  feedback: QuestionFeedbackSchema,
  nextQuestion: z.object({
    index: z.number().int().min(1).max(4),
    type: z.enum(['technical', 'behavioral']),
    question: z.string(),
  }).nullable(),
  summary: InterviewSummarySchema.nullable(),
});
```

**Example Evaluation Response (Question 1 of 5)**:
```json
{
  "feedback": {
    "score": 7,
    "feedback": "Good explanation of React component state versus props, but missed explaining how state triggers re-renders and the concept of immutability.",
    "sampleAnswer": "In React, 'props' are external, read-only inputs passed from parent to child components, whereas 'state' represents internal, mutable data managed within the component. When state updates via its setter function, React schedules a re-render to update the DOM.",
    "keyTakeaway": "Always mention re-rendering and unidirectional data flow when discussing React state."
  },
  "nextQuestion": {
    "index": 1,
    "type": "technical",
    "question": "Can you explain how the JavaScript Event Loop works, specifically the difference between microtasks and macrotasks?"
  },
  "summary": null
}
```
