# Contract: Target-Role Resume Checker API

**Endpoint**: `POST /api/resume-checker`
**Purpose**: Evaluates resume text against a target job role, returning an ATS score, strengths, weaknesses, missing keywords, and exactly 5 rewritten bullet points.

---

## Request

**Headers**:
`Content-Type: application/json`

**Body Schema (Zod)**:
```typescript
import { z } from 'zod';

export const ResumeCheckerRequestSchema = z.object({
  sessionId: z.string().uuid(),
  targetRole: z.string().min(2).max(100),
  resumeText: z.string().min(50).max(25000),
});

export type ResumeCheckerRequest = z.infer<typeof ResumeCheckerRequestSchema>;
```

**Example Request**:
```json
{
  "sessionId": "a8098c1a-f86e-11da-bd1a-00112444be1e",
  "targetRole": "Junior Frontend Developer",
  "resumeText": "Computer Science student at XYZ University. Built a React ecommerce site with shopping cart. Worked with HTML, CSS, JavaScript. Created backend with Node and Express."
}
```

---

## Response

**Status**: `200 OK`

**Body Schema (Zod)**:
```typescript
import { z } from 'zod';

export const BulletRewriteSchema = z.object({
  original: z.string(),
  improved: z.string(),
  rationale: z.string(),
});

export const ResumeCheckerResponseSchema = z.object({
  targetRole: z.string(),
  atsScore: z.number().int().min(0).max(100),
  strengths: z.array(z.string()).min(2),
  weaknesses: z.array(z.string()).min(2),
  missingKeywords: z.array(z.string()),
  bulletRewrites: z.array(BulletRewriteSchema).length(5),
  summary: z.string(),
});

export type ResumeCheckerResponse = z.infer<typeof ResumeCheckerResponseSchema>;
```

**Example Response**:
```json
{
  "targetRole": "Junior Frontend Developer",
  "atsScore": 62,
  "strengths": [
    "Mentions modern JavaScript stack (React, Node.js).",
    "Clear project context (ecommerce application)."
  ],
  "weaknesses": [
    "Lacks quantified impact metrics or user numbers.",
    "No mention of TypeScript, responsive design, or modern CSS frameworks."
  ],
  "missingKeywords": [
    "TypeScript",
    "Tailwind CSS",
    "RESTful API",
    "Responsive Web Design",
    "Git / GitHub"
  ],
  "bulletRewrites": [
    {
      "original": "Built a React ecommerce site with shopping cart.",
      "improved": "Architected a responsive React e-commerce web application featuring stateful cart management, reducing checkout interaction friction for 200+ test users.",
      "rationale": "Introduces strong action verb 'Architected' and highlights performance/user impact."
    },
    {
      "original": "Worked with HTML, CSS, JavaScript.",
      "improved": "Developed modular, accessible UI components utilizing semantic HTML5, modern CSS3 Flexbox/Grid, and ES6+ JavaScript.",
      "rationale": "Specifies modern standards and modular architecture rather than passive 'worked with'."
    },
    {
      "original": "Created backend with Node and Express.",
      "improved": "Engineered RESTful API endpoints using Node.js and Express to securely handle product catalogs and order transactions.",
      "rationale": "Highlights REST architecture and transaction handling."
    },
    {
      "original": "Handled bugs and fixed issues in the project.",
      "improved": "Diagnosed and resolved 15+ frontend state and rendering bugs using Chrome DevTools and React Developer Tools.",
      "rationale": "Quantifies issues resolved and names developer tooling."
    },
    {
      "original": "Deployed website to the internet.",
      "improved": "Configured CI/CD deployment pipeline via Vercel and GitHub, achieving automated builds and 99.9% uptime for the live demo.",
      "rationale": "Names modern deployment platform and CI/CD best practices."
    }
  ],
  "summary": "Your foundational React experience is solid. Enhancing bullets with quantifiable results and integrating missing keywords like TypeScript will significantly raise ATS pass rates."
}
```
