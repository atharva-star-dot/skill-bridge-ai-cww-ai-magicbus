import { prisma } from '../src/lib/db';
import { evaluateAnswerFallback } from '../src/lib/ai/fallbacks/interview.fallback';

const BASE_URL = 'http://localhost:3000';

async function runPhase5Evidence() {
  console.log('========================================================================');
  console.log('PHASE 5 COMPREHENSIVE EVIDENCE RUN');
  console.log('========================================================================\n');

  const eventLoopQuestion = 'Can you explain how the JavaScript Event Loop works, specifically detailing the difference between the microtask queue (such as Promises) and the macrotask queue (such as setTimeout), and how this affects the order of execution?';

  // 1.a AI PATH - 3 ANSWERS TO THE EVENT LOOP QUESTION
  console.log('------------------------------------------------------------------------');
  console.log('1.a: AI PATH - Junior Frontend Developer Event Loop Question');
  console.log('Question: "' + eventLoopQuestion + '"\n');

  const strongAnswer = `The JavaScript runtime is single-threaded, executing instructions on a call stack. Asynchronous operations are managed by the event loop, coordinating between the call stack, Web APIs, and two task queues: the microtask queue and the macrotask queue. When synchronous execution completes and the call stack empties, the event loop drains all queued microtasks (such as Promise callbacks, process.nextTick, or queueMicrotask) before picking any macrotask. Only after the entire microtask queue is completely exhausted does the event loop take the oldest task from the macrotask queue (such as setTimeout, setInterval, or I/O callbacks). Once that single macrotask executes, the event loop immediately inspects the microtask queue again and drains any new microtasks that were scheduled during that macrotask. Consequently, a resolved Promise will always execute before a setTimeout(0) callback, ensuring reliable execution order for asynchronous operations.`;
  const mediocreAnswer = `The event loop handles asynchronous JavaScript. It checks if the stack is empty and moves callbacks from queues to the stack. Promises and setTimeout are both async and run after normal synchronous code. Promises are microtasks and setTimeout is a macrotask. Promises run faster.`;
  const wrongAnswer = `JavaScript has a multi-threaded event loop architecture where every setTimeout spawns an independent worker thread in background memory. Macrotasks like setTimeout(0) always take strict precedence over Promise microtasks because timers interact directly with the operating system clock. Promises must wait until all macrotasks finish.`;

  // Start an interview session for Junior Frontend Developer
  const sessionUser = 'phase5-ai-test-' + Date.now();
  const startRes = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessionUser, targetRole: 'Junior Frontend Developer' }),
  });
  const startData = await startRes.json();
  const intId = startData.interviewSession.id;

  // Set the questions to be the Event Loop question so answers are evaluated against the requested question
  await prisma.interviewAnswer.updateMany({
    where: { interviewSessionId: intId },
    data: {
      questionText: eventLoopQuestion,
      questionType: 'technical',
    },
  });

  // Answer Q0 with strong answer
  const aiStrongRes = await fetch(`${BASE_URL}/api/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionUser,
      interviewSessionId: intId,
      questionIndex: 0,
      userAnswer: strongAnswer,
    }),
  });
  const aiStrong = await aiStrongRes.json();

  console.log('(a) Strong Answer (Word count: ~138 words):');
  console.log(`    Score: ${aiStrong.evaluation.score}/10 (Expected: 7-9)`);
  console.log(`    Strengths:`, aiStrong.evaluation.strengths);
  console.log(`    Improvements:`, aiStrong.evaluation.improvements);
  console.log(`    Source: ${aiStrong.evaluation.source}\n`);

  // Answer Q1 with mediocre answer
  const aiMedRes = await fetch(`${BASE_URL}/api/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionUser,
      interviewSessionId: intId,
      questionIndex: 1,
      userAnswer: mediocreAnswer,
    }),
  });
  const aiMed = await aiMedRes.json();

  console.log('(b) Mediocre Answer:');
  console.log(`    Score: ${aiMed.evaluation.score}/10 (Expected: 4-6)`);
  console.log(`    Strengths:`, aiMed.evaluation.strengths);
  console.log(`    Improvements:`, aiMed.evaluation.improvements);
  console.log(`    Source: ${aiMed.evaluation.source}\n`);

  // Answer Q2 with confident but wrong answer
  const aiWrongRes = await fetch(`${BASE_URL}/api/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionUser,
      interviewSessionId: intId,
      questionIndex: 2,
      userAnswer: wrongAnswer,
    }),
  });
  const aiWrong = await aiWrongRes.json();

  console.log('(c) Confident but Wrong Answer:');
  console.log(`    Score: ${aiWrong.evaluation.score}/10 (Expected: 1-4)`);
  console.log(`    Strengths:`, aiWrong.evaluation.strengths);
  console.log(`    Improvements:`, aiWrong.evaluation.improvements);
  console.log(`    Source: ${aiWrong.evaluation.source}\n`);

  // 1.b FALLBACK PATH - EVENT LOOP QUESTION
  console.log('------------------------------------------------------------------------');
  console.log('1.b: FALLBACK PATH - Anti-Gaming & Quality Checks on Event Loop Question');
  console.log('Testing directly against fallback evaluation logic:');

  const fbStrong = evaluateAnswerFallback('Junior Frontend Developer', 'technical', eventLoopQuestion, strongAnswer);
  console.log(`(a) Strong Answer on Fallback:`);
  console.log(`    Score: ${fbStrong.score}/10 (Expected: >= 7)`);
  console.log(`    Strengths:`, fbStrong.strengths);

  const fbCopied = evaluateAnswerFallback('Junior Frontend Developer', 'technical', eventLoopQuestion, eventLoopQuestion);
  console.log(`\n(b) Question Copied Back as Answer:`);
  console.log(`    Score: ${fbCopied.score}/10 (Expected: <= 3)`);
  console.log(`    Improvements:`, fbCopied.improvements);

  const rawKeywords = 'event loop, javascript, microtask, macrotask, promises, settimeout, queue, stack, single threaded, rendering, execution, asynchronous, callbacks, browser, engine';
  const fbKeywords = evaluateAnswerFallback('Junior Frontend Developer', 'technical', eventLoopQuestion, rawKeywords);
  console.log(`\n(c) 15 Raw Keywords with No Sentences:`);
  console.log(`    Score: ${fbKeywords.score}/10 (Expected: <= 3)`);
  console.log(`    Improvements:`, fbKeywords.improvements);

  // 1.c FALLBACK BEHAVIORAL - STAR VS VAGUE ONE-SENTENCE
  console.log('\n------------------------------------------------------------------------');
  console.log('1.c: FALLBACK BEHAVIORAL - Clear STAR vs Vague One-Sentence Answer');

  const behavioralQuestion = 'Describe a situation where you encountered a difficult technical bug in a college project or internship. How did you approach solving it and what did you learn?';
  const starAnswer = `In my college final-year capstone project, our web dashboard was experiencing severe input latency when syncing real-time charts. As the frontend lead, my task was to isolate the rendering bottleneck and keep UI frame rates above 55fps. I took action by profiling the application with Chrome DevTools Performance tab, debouncing high-frequency WebSocket updates to 16ms frames, and memoizing heavy SVG render components with React.useMemo. As a result, CPU utilization dropped by 42%, frame rates stabilized at 58fps, and our faculty panel awarded the project highest distinction.`;
  const vagueAnswer = `I worked on a team project in college and we finished it on time.`;

  const fbStar = evaluateAnswerFallback('Junior Frontend Developer', 'behavioral', behavioralQuestion, starAnswer);
  console.log(`(a) Clear STAR Answer:`);
  console.log(`    Score: ${fbStar.score}/10`);
  console.log(`    Strengths:`, fbStar.strengths);

  const fbVague = evaluateAnswerFallback('Junior Frontend Developer', 'behavioral', behavioralQuestion, vagueAnswer);
  console.log(`\n(b) Vague One-Sentence Answer:`);
  console.log(`    Score: ${fbVague.score}/10`);
  console.log(`    Improvements:`, fbVague.improvements);

  // 1.d MEASURED DURATION OF EACH AI-PATH CALL
  console.log('\n------------------------------------------------------------------------');
  console.log('1.d: MEASURED DURATION OF EACH AI-PATH CALL');
  const perfSession = 'perf-test-' + Date.now();

  // (1) Gap Detector
  const t0 = performance.now();
  const gapRes = await fetch(`${BASE_URL}/api/gap-detector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: perfSession,
      targetRole: 'Junior Frontend Developer',
      currentSkills: ['HTML', 'CSS', 'JavaScript'],
    }),
  });
  const gapData = await gapRes.json();
  const gapDuration = Math.round(performance.now() - t0);
  console.log(`1. POST /api/gap-detector: ${gapDuration}ms (Source: ${gapData.source})`);

  // (2) Learning Plan
  const t1 = performance.now();
  const planRes = await fetch(`${BASE_URL}/api/learning-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: perfSession,
      targetRole: 'Junior Frontend Developer',
      durationWeeks: 4,
    }),
  });
  const planData = await planRes.json();
  const planDuration = Math.round(performance.now() - t1);
  console.log(`2. POST /api/learning-plan: ${planDuration}ms (Source: ${planData.source})`);

  // (3) Resume Checker
  const t2 = performance.now();
  const resumeRes = await fetch(`${BASE_URL}/api/resume-checker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: perfSession,
      targetRole: 'Junior Frontend Developer',
      resumeText: 'Computer Science graduate. Skills: JavaScript, React, HTML, CSS. Built college web portal with user registration and dynamic components. Participated in hackathons.',
    }),
  });
  const resumeData = await resumeRes.json();
  const resumeDuration = Math.round(performance.now() - t2);
  console.log(`3. POST /api/resume-checker: ${resumeDuration}ms (Source: ${resumeData.source})`);

  // (4) Interview Start
  const t3 = performance.now();
  const intStartRes = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: perfSession,
      targetRole: 'Junior Frontend Developer',
    }),
  });
  const intStartData = await intStartRes.json();
  const intStartDuration = Math.round(performance.now() - t3);
  const intSessionId = intStartData.interviewSession.id;
  console.log(`4. POST /api/interview/start: ${intStartDuration}ms (Source: ${intStartData.source})`);

  // (5) Interview Answer
  const t4 = performance.now();
  const ansRes = await fetch(`${BASE_URL}/api/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: perfSession,
      interviewSessionId: intSessionId,
      questionIndex: 0,
      userAnswer: strongAnswer,
    }),
  });
  const ansData = await ansRes.json();
  const ansDuration = Math.round(performance.now() - t4);
  console.log(`5. POST /api/interview/answer: ${ansDuration}ms (Source: ${ansData.evaluation.source})`);

  // Complete answers 1-4 so summary can run
  for (let i = 1; i < 5; i++) {
    await fetch(`${BASE_URL}/api/interview/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: perfSession,
        interviewSessionId: intSessionId,
        questionIndex: i,
        userAnswer: `Answer to question ${i + 1} detailing technical mechanics and practical implementation.`,
      }),
    });
  }

  // (6) Interview Summary
  const t5 = performance.now();
  const sumRes = await fetch(`${BASE_URL}/api/interview/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: perfSession,
      interviewSessionId: intSessionId,
    }),
  });
  const sumData = await sumRes.json();
  const sumDuration = Math.round(performance.now() - t5);
  console.log(`6. POST /api/interview/summary: ${sumDuration}ms (Source: ${sumData.summary?.source || 'ai'})`);

  console.log('\nWhat happens on 20-second timeout:');
  console.log('In src/lib/ai/gemini.ts, executeGeminiWithRetry enforces Promise.race with a 20,000ms timeout.');
  console.log('When timeout fires, an Error("Gemini call timed out after 20000ms") is thrown,');
  console.log('which triggers the route catch block to fall back seamlessly to the deterministic fallback.');

  // 1.e INTERVIEW ACTIVE ENDPOINT ROLE-SWITCH RESTORATION
  console.log('\n------------------------------------------------------------------------');
  console.log('1.e: INTERVIEW ACTIVE ENDPOINT - Junior Frontend Developer -> Data Analyst -> Junior Frontend Developer');

  const switchUser = 'role-switch-evidence-' + Date.now();

  // Step 1: Start FE session and answer Q1 with score 8
  const feStart = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: switchUser, targetRole: 'Junior Frontend Developer' }),
  });
  const feData = await feStart.json();
  const feId = feData.interviewSession.id;

  await fetch(`${BASE_URL}/api/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: switchUser,
      interviewSessionId: feId,
      questionIndex: 0,
      userAnswer: 'Undefined means unassigned variable; null means intentional absence of an object value.',
    }),
  });

  const feActive1 = await (await fetch(`${BASE_URL}/api/interview/active?sessionId=${switchUser}&role=Junior%20Frontend%20Developer`)).json();
  console.log(`Step 1 (FE active): Session ID = ${feActive1.activeSession.id}, Role = ${feActive1.activeSession.targetRole}, Q1 Answered = ${feActive1.activeSession.questions[0].userAnswer !== null}`);

  // Step 2: Switch to Data Analyst
  const daStart = await fetch(`${BASE_URL}/api/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: switchUser, targetRole: 'Data Analyst' }),
  });
  const daData = await daStart.json();
  const daId = daData.interviewSession.id;

  const daActive = await (await fetch(`${BASE_URL}/api/interview/active?sessionId=${switchUser}&role=Data%20Analyst`)).json();
  console.log(`Step 2 (DA active): Session ID = ${daActive.activeSession.id}, Role = ${daActive.activeSession.targetRole}, Q1 Answered = ${daActive.activeSession.questions[0].userAnswer !== null}`);

  // Step 3: Switch back to Junior Frontend Developer
  const feRestored = await (await fetch(`${BASE_URL}/api/interview/active?sessionId=${switchUser}&role=Junior%20Frontend%20Developer`)).json();
  console.log(`Step 3 (FE restored): Session ID = ${feRestored.activeSession.id} (Matches Step 1: ${feRestored.activeSession.id === feId})`);
  console.log(`       Restored Q1 Answered = ${feRestored.activeSession.questions[0].userAnswer !== null}, Status = ${feRestored.activeSession.status}`);

  console.log('\n========================================================================');
  console.log('ALL PHASE 5 EVIDENCE CHECKS COMPLETE');
  console.log('========================================================================');
}

runPhase5Evidence().catch(console.error);
