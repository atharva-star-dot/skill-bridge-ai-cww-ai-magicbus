import type { MissingSkillItem } from '@/lib/schemas/gap-detector.schema';

export function buildLearningPlanPrompt(
  targetRole: string,
  missingSkills: MissingSkillItem[],
  matchedSkills: string[],
  durationWeeks: number
): string {
  // Sort: High → Medium → Low so weeks build on priority order
  const sorted = [...missingSkills].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const skillsBlock = sorted
    .map((s) => `- ${s.name} [${s.priority}]: ${s.reason}`)
    .join('\n');

  const alreadyHas = matchedSkills.length > 0 ? matchedSkills.join(', ') : 'none yet';
  const tasksPerWeek = durationWeeks <= 2 ? 4 : durationWeeks <= 4 ? 3 : 2;

  return `
You are a senior technical career mentor in India specialising in fresher and college-graduate tech placement.
Create a ${durationWeeks}-week personalised learning plan for a fresher targeting: "${targetRole}".

Skills already possessed (build on these, do not re-teach them):
${alreadyHas}

Missing skills to address — ordered by priority (address High-priority gaps in the first weeks):
${skillsBlock}

PLAN DESIGN RULES:
1. Produce exactly ${durationWeeks} week objects.
2. Allocate High-priority skills to the earliest weeks, Medium in the middle, Low in the last week(s).
3. Each week must have:
   - "weekNumber": integer (1 to ${durationWeeks})
   - "theme": concise week title (e.g. "TypeScript Foundations")
   - "focusSkills": 1-3 skill names from the missing skills list
   - "tasks": array of ${tasksPerWeek}-${tasksPerWeek + 1} tasks. Each task:
       * "title": short actionable title (e.g. "Build a typed React counter component")
       * "description": 1-2 sentences of guidance — what to learn and how to practice
       * "estimatedHours": realistic hours for a college student (0.5–8)
       * "skillsCovered": which skills this task helps with
       * "resources": 1-3 real, free resources. Each resource:
           - "title": descriptive title
           - "url": a real, publicly accessible URL (MDN, YouTube, official docs, freeCodeCamp, etc.)
           - "type": one of "article", "video", "course", "docs", "practice", "book"
   - "miniProject": a specific 1-sentence project idea that integrates the week's skills (e.g. "Build a GitHub profile card app using TypeScript and React that fetches from the GitHub API")
4. "overallGoal": 2 sentences summarising what the candidate will be able to do after ${durationWeeks} weeks.
5. "source" field: omit it (the API will add it).

Return strictly valid JSON matching this shape (no extra keys):
{
  "targetRole": "${targetRole}",
  "durationWeeks": ${durationWeeks},
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "TypeScript Foundations",
      "focusSkills": ["TypeScript"],
      "tasks": [
        {
          "title": "Set up a TypeScript project with Vite",
          "description": "Initialise a Vite+React+TypeScript template, explore tsconfig.json, and convert one plain-JS file to TypeScript with strict mode.",
          "estimatedHours": 2,
          "skillsCovered": ["TypeScript"],
          "resources": [
            { "title": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/handbook/intro.html", "type": "docs" }
          ]
        }
      ],
      "miniProject": "Build a simple typed to-do list app using React and TypeScript"
    }
  ],
  "overallGoal": "After ${durationWeeks} weeks you will have hands-on project experience with all priority skills and a portfolio demonstrating your readiness for ${targetRole} positions."
}
`;
}
