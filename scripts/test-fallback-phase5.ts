const BASE_URL = 'http://localhost:3000';

async function testFallback() {
  console.log('--- TEST (D): Fallback Mode with GEMINI_API_KEY unset ---');
  const sessionD = 'test-session-fb-' + Date.now();

  const startRes = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionD,
      targetRole: 'Junior Frontend Developer',
    }),
  });
  const startData = await startRes.json();
  console.log(`Fallback start: session id = ${startData.interviewSession.id}, source = ${startData.interviewSession.source}`);
  console.log(`Fallback Q1: ${startData.interviewSession.questions[0].questionText}`);

  // Submit answer
  const ansRes = await fetch(`${BASE_URL}/api/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionD,
      interviewSessionId: startData.interviewSession.id,
      questionIndex: 0,
      userAnswer: 'Undefined means variable declared without assignment, whereas null is an intentional assignment representing empty value. In TypeScript strictNullChecks treats them as distinct types.',
    }),
  });
  const ansData = await ansRes.json();
  console.log(`Fallback answer evaluation: score = ${ansData.evaluation.score}/10, source = ${ansData.evaluation.source}`);
  console.log(`Strengths:`, ansData.evaluation.strengths);
  console.log(`Improvements:`, ansData.evaluation.improvements);
  console.log(`Model Answer:`, ansData.evaluation.improvedSampleAnswer.slice(0, 100) + '...');
}

testFallback().catch(console.error);
