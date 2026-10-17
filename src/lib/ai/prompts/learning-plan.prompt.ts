import type { MissingSkillItem } from '@/lib/schemas/gap-detector.schema';

export function buildLearningPlanPrompt(
  targetRole: string,
  missingSkills: MissingSkillItem[],
  matchedSkills: string[],
  durationWeeks: number
): string {
  // Sort: High → Medium → Low so weeks build strictly in priority order
  const sorted = [...missingSkills].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const skillsBlock = sorted
    .map((s) => `- ${s.name} [${s.priority}]: ${s.reason}`)
    .join('\n');

  const alreadyHas = matchedSkills.length > 0 ? matchedSkills.join(', ') : 'none yet';

  return `
You are a senior technical career mentor in India specialising in fresher and college-graduate tech placement.
Create a ${durationWeeks}-week personalised learning plan for a fresher targeting: "${targetRole}".

Skills already possessed (build on these, do not re-teach them):
${alreadyHas}

Missing skills to address — ordered by priority (address High-priority gaps in the first weeks):
${skillsBlock}

STRICT CURRICULUM RULES:
1. Produce exactly ${durationWeeks} week objects.
2. High-priority missing skills MUST be tackled in the earliest weeks (e.g. Weeks 1 and 2 in a 4-week plan).
3. EVERY SINGLE WEEK MUST CONTAIN EXACTLY 3 TO 4 TASKS. Never return only 1 or 2 tasks in any week.
4. Each task must have:
   - "title": short actionable title (e.g. "Build a typed React counter component")
   - "description": 1-2 sentences of guidance on what to learn and build
   - "estimatedHours": realistic hours for a college student (1 to 6)
   - "skillsCovered": array of 1-2 skill names from the missing skills list
   - "resources": 1-3 real, free resources (MDN, official docs, freeCodeCamp, etc.)
       * "title": title
       * "url": valid public URL
       * "type": one of "article", "video", "course", "docs", "practice", "book"
5. MINI PROJECT PLACEMENT:
   - For weeks 1 to ${durationWeeks - 1}: miniProject is a brief weekly milestone practice component.
   - For the FINAL week (Week ${durationWeeks}): miniProject MUST BE a comprehensive, end-to-end Capstone Portfolio Mini Project combining all skills learned across the entire ${durationWeeks}-week roadmap, ready to demo to interviewers.
6. "overallGoal": 2 clear sentences on what the candidate will achieve.
7. Return strictly valid JSON.

Shape:
{
  "targetRole": "${targetRole}",
  "durationWeeks": ${durationWeeks},
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Core Fundamentals",
      "focusSkills": ["Skill A"],
      "tasks": [
        {
          "title": "Task 1",
          "description": "...",
          "estimatedHours": 3,
          "skillsCovered": ["Skill A"],
          "resources": [{ "title": "Docs", "url": "https://developer.mozilla.org", "type": "docs" }]
        },
        { "title": "Task 2", "description": "...", "estimatedHours": 3, "skillsCovered": ["Skill A"], "resources": [] },
        { "title": "Task 3", "description": "...", "estimatedHours": 3, "skillsCovered": ["Skill A"], "resources": [] }
      ],
      "miniProject": "Weekly component practice"
    }
  ],
  "overallGoal": "Summary..."
}
`;
}
