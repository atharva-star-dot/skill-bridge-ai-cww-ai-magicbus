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
  return `You are an expert interviewer evaluating a candidate's answer for the position of "${targetRole}".

QUESTION TYPE: ${questionType.toUpperCase()}
QUESTION:
"${questionText}"

CANDIDATE'S SUBMITTED ANSWER:
"${userAnswer}"

RUBRIC & STRICT SCORING GUIDELINES (EVALUATE FACTUAL CORRECTNESS, NOT TONE OR CONFIDENCE):
- Score strictly from 1 to 10 (integer).
- 1-3 (Wrong / Irrelevant / Extremely Minimal): The candidate provides factually incorrect explanations, confuses opposite concepts, answers a completely different question, or submits minimal keywords (e.g. single words, bullet lists with no explanation). Even if written with high confidence, FACTUAL ERRORS or fabricated mechanics MUST score 1 to 3.
- 4-6 (Mediocre / Half-Correct / Incomplete): The candidate grasps the high-level idea or defines one part correctly, but is missing core mechanisms, mixes up nuances, or gives an incomplete answer lacking practical explanation.
- 7-9 (Strong / Accurate / Nuanced): The candidate accurately explains the underlying mechanics, demonstrates correct technical knowledge (e.g. microtasks vs macrotasks, execution order, render phases), addresses edge cases, and communicates clearly. High quality, accurate candidate answers MUST be scored strictly between 7 and 9 (typically 8, or 9 for exceptional depth).
- 10 (Mastery / Theoretical Perfection): DO NOT award a 10 unless the candidate explicitly cites ECMA-262 specification clauses or V8/SpiderMonkey engine implementation details. Even flawless standard fresher answers must be capped at 8 or 9.

CRITICAL INSTRUCTION:
1. Strong, accurate answers must receive a score of 7, 8, or 9. Never give a 10 to a standard good answer.
2. Mediocre, incomplete answers must receive 4, 5, or 6.
3. Wrong, irrelevant, or factually incorrect answers must receive 1, 2, or 3. Even if written with high confidence, FACTUAL ERRORS or fabricated mechanics MUST score 1 to 3.

EVALUATION RULES:
1. Provide 2-3 specific "strengths" noting what was good or attempted in the candidate's answer. (If the answer was wrong or minimal, acknowledge the attempt or topic reference).
2. Provide 2-3 actionable "improvements" explicitly correcting any factual errors, detailing what the accurate mechanism is.
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
