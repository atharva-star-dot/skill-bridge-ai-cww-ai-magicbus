# Contract: Curated Jobs & Role Matching API

**Endpoint**: `GET /api/jobs`
**Purpose**: Matches a user's skills against a curated seed dataset of 30-50 entry-level roles without web scraping.

---

## Request

**Query Parameters**:
- `skills`: Comma-separated list of user skills (e.g., `skills=React,JavaScript,HTML,CSS`)
- `role`: (Optional) Filter by specific target role or category (e.g., `role=Frontend`)

**Example Request**:
`GET /api/jobs?skills=React,JavaScript,HTML,CSS&role=Frontend`

---

## Response

**Status**: `200 OK`

**Body Schema (Zod)**:
```typescript
import { z } from 'zod';

export const MatchedJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  salaryRange: z.string(),
  experience: z.string(),
  matchPercentage: z.number().int().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  applyUrl: z.string(),
});

export const JobsResponseSchema = z.object({
  totalRolesCount: z.number().int(),
  matchedJobs: z.array(MatchedJobSchema),
});

export type JobsResponse = z.infer<typeof JobsResponseSchema>;
```

**Example Response**:
```json
{
  "totalRolesCount": 42,
  "matchedJobs": [
    {
      "id": "job-003",
      "title": "Junior Frontend Engineer",
      "company": "TechCorp India",
      "location": "Bengaluru (Hybrid)",
      "salaryRange": "₹4.5 - ₹6.5 LPA",
      "experience": "0-1 Years",
      "matchPercentage": 80,
      "matchedSkills": ["HTML", "CSS", "JavaScript", "React"],
      "missingSkills": ["TypeScript"],
      "applyUrl": "https://example.com/jobs/techcorp-fe"
    },
    {
      "id": "job-012",
      "title": "Web Developer Intern",
      "company": "GrowthScale Labs",
      "location": "Remote (India)",
      "salaryRange": "₹25,000/month",
      "experience": "Fresher",
      "matchPercentage": 100,
      "matchedSkills": ["HTML", "CSS", "JavaScript", "React"],
      "missingSkills": [],
      "applyUrl": "https://example.com/jobs/growthscale-intern"
    }
  ]
}
```
