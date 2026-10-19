export interface InterviewAnswerScore {
  questionIndex: number;
  score: number | null;
}

export function hasFiveScoredAnswers(answers: readonly InterviewAnswerScore[]): boolean {
  return (
    answers.length === 5 &&
    answers.every((answer, index) => answer.questionIndex === index && answer.score !== null)
  );
}
