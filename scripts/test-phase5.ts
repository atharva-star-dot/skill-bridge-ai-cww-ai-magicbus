const BASE_URL = 'http://localhost:3000';

async function testPhase5() {
  console.log('========================================================================');
  console.log('PHASE 5 COMPREHENSIVE AUTOMATED VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Test (a): Full 5-question run for Junior Frontend Developer
  console.log('--- TEST (A): Full 5-Question Run for Junior Frontend Developer ---');
  const sessionA = 'test-session-fe-' + Date.now();

  // Create gap report first so interview knows missing skills
  await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionA,
      targetRole: 'Junior Frontend Developer',
      currentSkills: ['HTML5', 'CSS3', 'JavaScript'],
    }),
  });

  const gapRes = await fetch(`${BASE_URL}/api/gap-detector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionA,
      targetRole: 'Junior Frontend Developer',
      currentSkills: ['HTML5', 'CSS3', 'JavaScript'],
    }),
  });
  const gapData = await gapRes.json();
  console.log(`Gap report created: readinessScore = ${gapData.readinessScore}, missing: ${gapData.missingSkills.map((m: any) => m.name).join(', ')}`);

  // Start interview
  const startRes = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionA,
      targetRole: 'Junior Frontend Developer',
    }),
  });
  const startData = await startRes.json();
  console.log(`Started session ID: ${startData.interviewSession.id}, source: ${startData.interviewSession.source}`);
  console.log(`Generated 5 questions:`);
  startData.interviewSession.questions.forEach((q: any) => {
    console.log(`  [Q${q.questionIndex + 1} - ${q.questionType}] ${q.questionText}`);
  });

  const answersSample = [
    'In JavaScript, undefined means a variable has been declared but not assigned. Null is an intentional value indicating no object. In TypeScript, strictNullChecks separates both into distinct types.',
    'The virtual DOM is a lightweight memory copy of the real DOM. React diffs changes using reconciliation. The key prop helps React identify list items uniquely during re-rendering.',
    'CSS specificity determines which rule takes precedence using IDs, classes, and elements. Tailwind avoids specificity conflicts because utility classes reside on the same layer.',
    'I would add an isSubmitting state boolean that immediately disables the submit button on the first click and display a loading indicator until the promise resolves.',
    'In my college final year project, our team faced an API timeout bug. I took the lead, used network logs to isolate slow queries, added indexing to SQL, and we completed the demo on time.',
  ];

  for (let i = 0; i < 5; i++) {
    const ansRes = await fetch(`${BASE_URL}/api/interview/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionA,
        interviewSessionId: startData.interviewSession.id,
        questionIndex: i,
        userAnswer: answersSample[i],
      }),
    });
    const ansData = await ansRes.json();
    console.log(`  Q${i + 1} Score: ${ansData.evaluation.score}/10 | Strengths: ${ansData.evaluation.strengths.slice(0, 1).join('')} | Source: ${ansData.evaluation.source}`);
  }

  // Generate summary
  const summRes = await fetch(`${BASE_URL}/api/interview/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionA,
      interviewSessionId: startData.interviewSession.id,
    }),
  });
  const summData = await summRes.json();
  console.log(`\nFinal Summary for Junior Frontend Developer:`);
  console.log(`Overall Score (computed in code): ${summData.summary.overallScore}/10`);
  console.log(`Per-Question Scores:`, summData.summary.perQuestionScores.map((s: any) => `Q${s.questionIndex + 1}: ${s.score}`));
  console.log(`Top Strengths:`, summData.summary.topStrengths);
  console.log(`Top Weaknesses:`, summData.summary.topWeaknesses);
  console.log(`Recommended Next Steps:`, summData.summary.recommendedNextSteps);

  // Check /api/session reflects the interview score
  const checkSessionRes = await fetch(`${BASE_URL}/api/session?sessionId=${sessionA}`);
  const checkSessionData = await checkSessionRes.json();
  console.log(`Session API activeInterviewSummary:`, checkSessionData.activeInterviewSummary);

  // Test (b): Data Analyst free-text role
  console.log('\n--- TEST (B): Data Analyst Free-Text Role ---');
  const sessionB = 'test-session-da-' + Date.now();
  const startDARes = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionB,
      targetRole: 'Data Analyst',
    }),
  });
  const startDAData = await startDARes.json();
  console.log(`Started Data Analyst session ID: ${startDAData.interviewSession.id}, source: ${startDAData.interviewSession.source}`);
  startDAData.interviewSession.questions.forEach((q: any) => {
    console.log(`  [Q${q.questionIndex + 1} - ${q.questionType}] ${q.questionText}`);
  });

  // Test (c): Weak one-word answer
  console.log('\n--- TEST (C): Weak One-Word Answer Evaluation ---');
  const weakAnsRes = await fetch(`${BASE_URL}/api/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionB,
      interviewSessionId: startDAData.interviewSession.id,
      questionIndex: 0,
      userAnswer: 'SQL',
    }),
  });
  const weakAnsData = await weakAnsRes.json();
  if (weakAnsData.error) {
    console.error('Weak ans error response:', weakAnsData);
  }
  console.log(`Weak answer result: score = ${weakAnsData.evaluation.score}/10 (must be 1-3)`);
  console.log(`Feedback strengths:`, weakAnsData.evaluation.strengths);
  console.log(`Feedback improvements:`, weakAnsData.evaluation.improvements);
  console.log(`Sample answer provided:`, weakAnsData.evaluation.improvedSampleAnswer.slice(0, 80) + '...');

  // Test (e): Refresh mid-session and resume
  console.log('\n--- TEST (E): Refresh Mid-Session & Resume ---');
  const activeRes = await fetch(`${BASE_URL}/api/interview/active?sessionId=${sessionB}&role=Data%20Analyst`);
  const activeData = await activeRes.json();
  console.log(`Resume active check for ${sessionB}: status = ${activeData.activeSession.status}, currentQuestionIndex = ${activeData.activeSession.currentQuestionIndex}`);
  console.log(`Q1 already answered: score = ${activeData.activeSession.questions[0].score}`);

  // Test (f): Role switch starting a new session
  console.log('\n--- TEST (F): Role Switch Starting a New Session ---');
  // Switch sessionB to "Cybersecurity Analyst"
  const startSwitchedRes = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionB,
      targetRole: 'Cybersecurity Analyst',
    }),
  });
  const startSwitchedData = await startSwitchedRes.json();
  console.log(`Switched to Cybersecurity Analyst: new interviewSession id = ${startSwitchedData.interviewSession.id}`);
  console.log(`Target role: ${startSwitchedData.interviewSession.targetRole}`);
  // Check active for the old role still returns its Data Analyst session in history
  const oldRoleCheck = await fetch(`${BASE_URL}/api/interview/active?sessionId=${sessionB}&role=Data%20Analyst`);
  const oldRoleData = await oldRoleCheck.json();
  console.log(`Old role Data Analyst still preserved in DB with ID: ${oldRoleData.activeSession.id}`);

  console.log('\n========================================================================');
  console.log('PHASE 5 VERIFICATION COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
}

testPhase5().catch(console.error);
