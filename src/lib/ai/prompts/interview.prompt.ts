/**
 * AI prompt templates for role-specific interview questioning, answer evaluation, and summary report.
 */

export function buildGenerateQuestionsPrompt(
  targetRole: string,
  missingSkills: string[],
  priorQuestions: string[] = []
): string {
  const missingSkillsStr = missingSkills.length > 0 ? missingSkills.join(', ') : 'None specified (focus on core role fundamentals)';
  const priorQuestionsStr =
    priorQuestions.length > 0
      ? `\nPREVIOUS QUESTIONS ASKED TO THIS CANDIDATE (DO NOT REPEAT OR CLOSELY PARAPHRASE ANY OF THESE):\n${priorQuestions
          .map((q, i) => `${i + 1}. "${q}"`)
          .join('\n')}\n`
      : '';

  return `You are a Principal Engineering Director and Senior Hiring Manager conducting an interview for an entry-level candidate (fresher / college graduate).

TARGET ROLE: "${targetRole}"
CANDIDATE'S IDENTIFIED SKILL GAPS / MISSING SKILLS: ${missingSkillsStr}
${priorQuestionsStr}
TASK:
Generate exactly 5 realistic, rigorous interview questions for this specific role:
- Question index 0: "technical" - Core technical knowledge question.
- Question index 1: "technical" - Probing technical question targeting one of the candidate's missing skills (${missingSkillsStr}).
- Question index 2: "technical" - Practical architecture, debugging, or tool usage question targeting another missing skill or core skill.
- Question index 3: "scenario" - A real-world scenario or problem-solving challenge (e.g. debugging an edge case, performance trade-off, incident triage).
- Question index 4: "behavioral" - Situational behavioral question formatted to elicit the STAR method (Situation, Task, Action, Result), such as handling conflicting deadlines, code review disagreements, or learning under pressure.

IMPORTANT RULES:
1. At least 2 questions MUST directly probe the candidate's missing skills (${missingSkillsStr}).
2. Do NOT repeat or paraphrase any previously asked questions listed above.
3. Questions must be tailored specifically to "${targetRole}". Never ask generic non-role-related puzzles.
4. Output MUST conform strictly to the JSON schema.

JSON OUTPUT FORMAT:
{
  "questions": [
    {
      "questionIndex": 0,
      "questionType": "technical",
      "questionText": "...",
      "skillTested": "..."
    },
    {
      "questionIndex": 1,
      "questionType": "technical",
      "questionText": "...",
      "skillTested": "..."
    },
    {
      "questionIndex": 2,
      "questionType": "technical",
      "questionText": "...",
      "skillTested": "..."
    },
    {
      "questionIndex": 3,
      "questionType": "scenario",
      "questionText": "...",
      "skillTested": "..."
    },
    {
      "questionIndex": 4,
      "questionType": "behavioral",
      "questionText": "...",
      "skillTested": "..."
    }
  ],
  "source": "ai"
}`;
}

export function buildEvaluateAnswerPrompt(
  targetRole: string,
  questionType: string,
  questionText: string,
  userAnswer: string
): string {
  const isMinimal = userAnswer.trim().split(/\s+/).length < 5;

  return `You are an expert interviewer evaluating a candidate's answer for the position of "${targetRole}".

QUESTION TYPE: ${questionType.toUpperCase()}
QUESTION:
"${questionText}"

CANDIDATE'S SUBMITTED ANSWER:
"${userAnswer}"

RUBRIC & SCORING GUIDELINES:
- Score strictly from 1 to 10 (integer).
- 1-3: Minimal, one-word, off-topic, or completely inaccurate answer. Provide constructive feedback on what was missing. DO NOT error out.
- 4-5: Superficial or incomplete answer. Mentions some keywords but lacks depth, mechanism, or structure.
- 6-7: Good solid fresher answer. Accurate fundamentals, covers main concepts, but misses edge cases, nuances, or concrete examples.
- 8-9: Excellent answer with strong clarity, correct terminology, realistic examples (or STAR structure if behavioral), and trade-offs.
- 10: Outstanding, exceptional mastery.

EVALUATION RULES:
1. Provide 2-3 specific "strengths" noting what was good or attempted in the candidate's answer. (If the answer was minimal, acknowledge their attempt or keyword).
2. Provide 2-3 actionable "improvements" highlighting specific omissions, best practices, or missing technical details.
3. "improvedSampleAnswer": Write a realistic, highly specific model answer that directly answers the question for a fresher role.
   - For technical questions: clearly explain core concepts, code behavior, and best practices.
   - For behavioral questions: format the answer using the STAR method (Situation, Task, Action, Result).
   - NEVER provide a generic template like "In my previous experience...". Make the sample answer concrete and directly relevant to "${questionText}".

JSON OUTPUT FORMAT:
{
  "score": 7,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "improvedSampleAnswer": "...",
  "source": "ai"
}`;
}

export function buildSummaryPrompt(
  targetRole: string,
  perQuestionScores: Array<{
    questionIndex: number;
    questionType: string;
    questionText: string;
    userAnswer: string | null;
    score: number;
  }>,
  missingSkills: string[]
): string {
  const historyText = perQuestionScores
    .map(
      (q) =>
        `Q${q.questionIndex + 1} (${q.questionType}, Score ${q.score}/10):\nQuestion: ${q.questionText}\nCandidate Answer: ${
          q.userAnswer || '(unanswered)'
        }`
    )
    .join('\n\n');

  return `You are a Senior Career Coach and Hiring Manager synthesizing the final interview performance for a candidate interviewing for "${targetRole}".

INTERVIEW TRANSCRIPT & SCORES:
${historyText}

CANDIDATE'S MISSING SKILLS IDENTIFIED FROM GAP REPORT:
${missingSkills.length > 0 ? missingSkills.join(', ') : 'None specified'}

TASK:
1. Review all answers and scores.
2. Identify top 3 overall strengths demonstrated across the interview.
3. Identify top 3 key weaknesses or blind spots observed.
4. Recommend 3-4 specific next steps, directly tied to actionable skills (e.g. practicing system architecture, revising SQL join mechanics, or structuring behavioral stories using the STAR method).
   - Whenever possible, tie the recommendation to missing skills: ${missingSkills.join(', ')}.

JSON OUTPUT FORMAT:
{
  "topStrengths": ["...", "...", "..."],
  "topWeaknesses": ["...", "...", "..."],
  "recommendedNextSteps": [
    { "step": "...", "skill": "..." },
    { "step": "...", "skill": "..." },
    { "step": "...", "skill": "..." }
  ],
  "source": "ai"
}`;
}
