export function buildSkillGapPrompt(
  targetRole: string,
  currentSkills: string[],
  resumeText?: string,
  benchmarkSkills?: string[]
): string {
  const skillsList = currentSkills.length > 0 ? currentSkills.join(', ') : 'None explicitly specified';
  const benchmarkContext = benchmarkSkills && benchmarkSkills.length > 0
    ? `Standard industry benchmark competencies for this role include: ${benchmarkSkills.join(', ')}.`
    : '';

  return `
You are an expert technical hiring manager and career mentor in India specializing in entry-level, fresher, and college graduate tech placement.
Analyze the candidate's profile against market expectations for the target role: "${targetRole}".

${benchmarkContext}

Candidate Current Skills:
${skillsList}

${resumeText && resumeText.trim() ? `Candidate Resume / Experience Text:\n"""\n${resumeText.trim()}\n"""` : ''}

CRITICAL INSTRUCTIONS:
1. Identify the 6 to 12 most important competencies expected for an entry-level/fresher "${targetRole}".
2. Determine which of these required skills the candidate already possesses (matchedSkills). If a resume was pasted, extract and recognize skills mentioned in it.
3. Determine all missing skills. For each missing skill:
   - "name": Concise skill name (e.g., "TypeScript", "SQL", "Git").
   - "priority": Must be exactly "High" (absolute dealbreaker/core requirement for junior hiring), "Medium" (important differentiator), or "Low" (good to have / easily learned on the job).
   - "reason": A crisp 1-sentence explanation of why this skill is critical for fresher hiring in "${targetRole}".
   - "category": One of "Core Technical", "Tool / Framework", or "Soft Skill / Workflow".
4. Calculate an honest "readinessScore" (integer 0 to 100) based on the coverage and weight of matched skills vs missing skills.
   - If candidate has almost no matching skills: score must be between 10 and 25 (avoid 0 unless totally irrelevant).
   - If candidate matches half the core skills: score ~50-65.
   - If candidate matches all core skills: score ~85-98.
5. Provide a constructive, encouraging "summary" (2-3 sentences) guiding the candidate on what to focus on first.

Return strictly valid JSON with this shape:
{
  "targetRole": "${targetRole}",
  "readinessScore": 65,
  "requiredSkills": ["Skill A", "Skill B", "Skill C"],
  "matchedSkills": ["Skill A"],
  "missingSkills": [
    {
      "name": "Skill B",
      "priority": "High",
      "reason": "Used in 80%+ of production codebases for this role.",
      "category": "Core Technical"
    }
  ],
  "extractedResumeSkills": ["Skill A"],
  "summary": "You have a solid foundation in..."
}
`;
}
