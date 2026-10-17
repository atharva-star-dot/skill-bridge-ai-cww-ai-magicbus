import {
  GenerateQuestionsResponse,
  AnswerEvaluation,
  InterviewSummary,
  QuestionType,
} from '@/lib/schemas/interview.schema';

interface SeedBankItem {
  type: QuestionType;
  question: string;
  skill: string;
  expectedKeywords: string[];
  modelAnswer: string;
}

// Curated question banks per top seeded roles + generic bank for free-text roles
const QUESTION_BANKS: Record<string, SeedBankItem[]> = {
  'junior-frontend-developer': [
    {
      type: 'technical',
      question: 'Can you explain the difference between undefined and null in JavaScript, and how TypeScript handles them?',
      skill: 'JavaScript / TypeScript',
      expectedKeywords: ['undefined', 'null', 'primitive', 'type', 'assigned', 'strictnullchecks'],
      modelAnswer:
        'In JavaScript, undefined means a variable has been declared but has not yet been assigned a value, or a function returns no value. Null is an intentional assignment representing an explicit absence of any object value. In TypeScript, with strictNullChecks enabled, null and undefined have their own distinct types and cannot be assigned to other types unless explicitly unioned (e.g. string | null).',
    },
    {
      type: 'technical',
      question: 'How does React Virtual DOM work, and why is key important when rendering lists?',
      skill: 'React',
      expectedKeywords: ['virtual dom', 'reconciliation', 'diffing', 'key', 'rerender', 're-render', 'performance'],
      modelAnswer:
        'React creates a lightweight in-memory representation of the real DOM called the Virtual DOM. When state changes, React generates a new Virtual DOM tree and diffs it with the previous snapshot (reconciliation) to calculate minimal DOM mutations. The key prop gives elements a stable identity across renders so React can track which items were added, removed, or reordered rather than re-rendering the whole list.',
    },
    {
      type: 'technical',
      question: 'What is CSS specificity, and how does Tailwind CSS prevent specificity conflicts?',
      skill: 'CSS / Tailwind CSS',
      expectedKeywords: ['specificity', 'classes', 'utility', 'inline', 'cascade', 'tailwind'],
      modelAnswer:
        'CSS specificity determines which CSS rule applies when multiple rules match the same element, calculated by inline styles, IDs, classes/attributes, and tag names. Tailwind CSS prevents specificity wars by generating single-purpose utility classes that all live on the same class-level specificity layer and by ordering utilities predictably in the generated stylesheet.',
    },
    {
      type: 'technical',
      question: 'How do you optimize initial page load performance in a React or Next.js application?',
      skill: 'Next.js / Performance',
      expectedKeywords: ['lazy loading', 'code splitting', 'bundle', 'images', 'ssr', 'dynamic import', 'caching'],
      modelAnswer:
        'Key strategies include: code-splitting using dynamic imports (React.lazy or next/dynamic) to load JavaScript bundles on demand, optimizing images using Next.js Image component with WebP/AVIF compression, server-side rendering or static generation to deliver HTML early, and deferring non-critical scripts.',
    },
    {
      type: 'technical',
      question: 'What are React Hooks rules, and how does the useEffect dependency array affect component execution?',
      skill: 'React Hooks',
      expectedKeywords: ['hooks', 'top level', 'dependencies', 'render', 'infinite loop', 'cleanup'],
      modelAnswer:
        'Hooks must only be called at the top level of React function components and custom hooks, never inside loops, conditions, or nested functions. The useEffect dependency array dictates when the effect re-runs: omitted means it runs on every render; empty array [] runs once on mount; and values [a, b] re-run only when those dependencies change by referential comparison. Returning a function provides a cleanup phase.',
    },
    {
      type: 'scenario',
      question: 'A user reports that clicking a "Submit" button on your form causes multiple duplicate API calls when clicked rapidly. How would you diagnose and fix this on the frontend?',
      skill: 'REST APIs / State Management',
      expectedKeywords: ['debounce', 'disable', 'loading state', 'isSubmitting', 'abortcontroller', 'double click'],
      modelAnswer:
        'I would first inspect the Network tab in DevTools to confirm duplicate POST requests. To fix it, I would introduce an isSubmitting / isLoading boolean state in React that immediately disables the submit button and shows a spinner while the promise is pending. For additional defense, I would debounce the click handler or use AbortController to cancel in-flight duplicate requests.',
    },
    {
      type: 'scenario',
      question: 'Your teammate merges a component that causes an infinite re-render crash in the browser. How do you isolate the cause and solve it?',
      skill: 'React Debugging',
      expectedKeywords: ['useeffect', 'dependency', 'state update', 'reference', 'devtools', 'usecallback', 'usememo'],
      modelAnswer:
        'An infinite re-render is typically caused by triggering a state setter directly in the render body or inside a useEffect whose dependency array includes an object or array recreated on every render. I would check React DevTools Profiler or insert console logs in the effect. The fix is wrapping object/function dependencies in useMemo or useCallback, or moving the setter into an event handler.',
    },
    {
      type: 'behavioral',
      question: 'Describe a situation where you encountered a difficult technical bug in a college project or internship. How did you approach solving it and what did you learn?',
      skill: 'Problem Solving & Communication',
      expectedKeywords: ['situation', 'task', 'action', 'result', 'debug', 'isolated', 'learned'],
      modelAnswer:
        'In my final year capstone project, our authentication token was unexpectedly dropping on page refreshes. I used Chrome DevTools and network inspection to trace the request cycle, reproduced the issue in an isolated test, and discovered our cookie was missing the proper SameSite and Secure attributes for cross-origin local testing. I updated our cookie configuration and documented the setup in our repo README so teammates would not hit the same issue.',
    },
  ],
  'data-analyst': [
    {
      type: 'technical',
      question: 'What is the difference between WHERE and HAVING clauses in SQL, and when would you use each?',
      skill: 'SQL',
      expectedKeywords: ['where', 'having', 'aggregate', 'group by', 'filter', 'rows'],
      modelAnswer:
        'The WHERE clause filters individual rows before any aggregations or GROUP BY grouping takes place. The HAVING clause filters grouped records or aggregated metrics (like SUM, COUNT, AVG) after the GROUP BY clause is evaluated. For example, WHERE age > 21 filters candidate rows, while HAVING COUNT(order_id) > 5 filters aggregated user groups.',
    },
    {
      type: 'technical',
      question: 'Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN with practical business examples.',
      skill: 'SQL',
      expectedKeywords: ['inner join', 'left join', 'full outer join', 'null', 'match', 'records'],
      modelAnswer:
        'INNER JOIN returns only records that have matching keys in both tables (e.g. customers who have placed at least one order). LEFT JOIN returns all rows from the left table and matched rows from the right table, filling nulls if no match exists (e.g. all customers including those with zero orders). FULL OUTER JOIN returns all rows from both tables, combining matches and retaining unlinked rows on either side.',
    },
    {
      type: 'technical',
      question: 'In Pandas, what is the difference between loc and iloc, and how do you handle missing NaN values in a dataset?',
      skill: 'Python / Pandas',
      expectedKeywords: ['loc', 'iloc', 'label', 'index', 'integer', 'dropna', 'fillna', 'nan'],
      modelAnswer:
        'df.loc is label-based, allowing selection by column names and row labels. df.iloc is integer position-based, indexing from 0 to length-1 regardless of explicit labels. To handle missing NaN values, we can inspect them via df.isna().sum(), and either drop them with df.dropna() if negligible, or impute them with df.fillna() using median, mean, or mode based on the feature distribution.',
    },
    {
      type: 'technical',
      question: 'What are window functions in SQL, and how would you use ROW_NUMBER() or RANK() to find the top transaction per customer?',
      skill: 'SQL Window Functions',
      expectedKeywords: ['window', 'partition by', 'order by', 'row_number', 'rank', 'over'],
      modelAnswer:
        'Window functions perform calculations across a set of table rows related to the current row without collapsing them into a single row like GROUP BY. To get the top transaction per customer, we write: SELECT * FROM (SELECT *, ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY amount DESC) as rn FROM transactions) t WHERE rn = 1.',
    },
    {
      type: 'technical',
      question: 'How do you choose between an exploratory chart (e.g., boxplot, histogram, scatter plot) when presenting business insights?',
      skill: 'Data Visualization',
      expectedKeywords: ['histogram', 'boxplot', 'scatter plot', 'distribution', 'outlier', 'correlation'],
      modelAnswer:
        'A histogram is best for visualizing the single-variable frequency distribution of continuous values. A boxplot is ideal for comparing distributions and spotting outliers across categories. A scatter plot is optimal for observing correlations, relationships, and clustering between two continuous numerical variables.',
    },
    {
      type: 'scenario',
      question: 'You receive an Excel sheet with 50,000 rows where 15% of customer revenue numbers are stored as text with stray currency symbols and commas. How would you clean this in Python or SQL?',
      skill: 'Data Cleaning',
      expectedKeywords: ['clean', 'regex', 'replace', 'cast', 'float', 'strip', 'numeric'],
      modelAnswer:
        'In Python with Pandas, I would clean the column using regex string replacement: df["revenue"] = df["revenue"].astype(str).str.replace(r"[$,]", "", regex=True). Then I would convert it using pd.to_numeric(df["revenue"], errors="coerce") so that any invalid values become NaN for auditing before calculating aggregates.',
    },
    {
      type: 'scenario',
      question: 'A stakeholder claims the monthly conversion rate dropped by 20%, but the raw sales numbers look the same. How do you investigate this discrepancy?',
      skill: 'Analytical Thinking',
      expectedKeywords: ['conversion rate', 'denominator', 'numerator', 'visitors', 'traffic', 'funnel', 'segment'],
      modelAnswer:
        'Conversion rate equals conversions divided by total traffic (visitors). If sales numbers are constant but the conversion rate dropped, the denominator (traffic) must have spiked—potentially due to bot traffic, an unfocused marketing campaign, or a tracking tag double-counting page views. I would segment traffic by source, channel, and device to isolate where the denominator inflated.',
    },
    {
      type: 'behavioral',
      question: 'Tell me about a time you had to explain a complex data finding or technical metric to a non-technical stakeholder or professor.',
      skill: 'Stakeholder Communication',
      expectedKeywords: ['situation', 'task', 'action', 'result', 'simplified', 'visuals', 'impact'],
      modelAnswer:
        'During an academic project, our faculty advisor found statistical p-values and regression outputs confusing. Rather than presenting raw coefficients, I created a clean bar chart illustrating projected cost savings under three business scenarios. I focused on actionable outcomes rather than statistical jargon, which helped our committee approve our project methodology immediately.',
    },
  ],
};

// Generic questions fallback for custom free-text roles
const GENERIC_QUESTION_BANK: SeedBankItem[] = [
  {
    type: 'technical',
    question: 'What are the foundational principles and tools you rely on when developing solutions in your field?',
    skill: 'Core Fundamentals',
    expectedKeywords: ['architecture', 'tools', 'process', 'principles', 'best practices'],
    modelAnswer:
      'My workflow starts with clear requirements gathering and modular architecture design. I use industry-standard version control (Git), automated linting and testing, and adhere to clean code principles like separation of concerns and DRY (Don\'t Repeat Yourself) to ensure maintainable deliverables.',
  },
  {
    type: 'technical',
    question: 'How do you approach learning a new tool or technology stack quickly when an assignment requires it?',
    skill: 'Continuous Learning',
    expectedKeywords: ['documentation', 'proof of concept', 'tutorial', 'hands-on', 'fundamentals'],
    modelAnswer:
      'I start with official documentation and official quickstarts to grasp core architectural concepts. Then, I build a mini proof-of-concept project within 48 hours to test real-world patterns, error handling, and integrations. Finally, I review community best practices to avoid common pitfalls.',
  },
  {
    type: 'technical',
    question: 'How do you ensure data integrity, error handling, and reliability in your technical solutions?',
    skill: 'Quality & Testing',
    expectedKeywords: ['validation', 'error handling', 'try catch', 'tests', 'logging', 'edge cases'],
    modelAnswer:
      'I implement input validation at the system boundary (using schemas or strict types), wrap asynchronous boundaries in defensive try/catch blocks with informative error logging, and write automated unit tests covering both the happy path and edge cases.',
  },
  {
    type: 'scenario',
    question: 'Suppose you are handed an ambiguous assignment with incomplete requirements and a short deadline. What step-by-step actions do you take?',
    skill: 'Ambiguity & Problem Solving',
    expectedKeywords: ['clarify', 'scope', 'stakeholders', 'assumptions', 'mvp', 'prioritize'],
    modelAnswer:
      'First, I break down what is known versus unknown and write down explicit assumptions. Second, I schedule a quick 10-minute check-in with the team lead or stakeholder with a proposed MVP scope. Third, I prioritize core functionality, deliver an early draft for feedback, and iterate.',
  },
  {
    type: 'behavioral',
    question: 'Give an example of a time when you received constructive criticism or negative feedback on your work. How did you handle it?',
    skill: 'Receptiveness & Growth',
    expectedKeywords: ['situation', 'task', 'action', 'result', 'feedback', 'improved', 'learned'],
    modelAnswer:
      'During a code review for a team project, a peer noted that my functions were too large and lacked unit tests. Instead of taking it defensively, I thanked them, asked for their recommended testing structure, and refactored the module into smaller single-responsibility functions with 85% test coverage. This made future features significantly faster to ship.',
  },
];

export function getFallbackQuestions(
  targetRole: string,
  missingSkills: string[],
  priorQuestions: string[] = []
): GenerateQuestionsResponse {
  const normalizedKey = targetRole.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  let bank = QUESTION_BANKS[normalizedKey];

  if (!bank) {
    if (normalizedKey.includes('front') || normalizedKey.includes('react') || normalizedKey.includes('web')) {
      bank = QUESTION_BANKS['junior-frontend-developer'];
    } else if (normalizedKey.includes('data') || normalizedKey.includes('analyst') || normalizedKey.includes('sql')) {
      bank = QUESTION_BANKS['data-analyst'];
    } else {
      bank = GENERIC_QUESTION_BANK;
    }
  }

  // Filter out any questions already asked in previous sessions
  const availableQuestions = bank.filter((item) => !priorQuestions.some((pq) => pq.toLowerCase().includes(item.question.slice(0, 30).toLowerCase())));
  const selectedPool = availableQuestions.length >= 5 ? availableQuestions : bank;

  // Pick 3 technical, 1 scenario, 1 behavioral
  const technicals = selectedPool.filter((q) => q.type === 'technical');
  const scenarios = selectedPool.filter((q) => q.type === 'scenario');
  const behaviorals = selectedPool.filter((q) => q.type === 'behavioral');

  const picked: SeedBankItem[] = [];

  // Pick 3 technical
  for (let i = 0; i < 3; i++) {
    picked.push(technicals[i % technicals.length] || GENERIC_QUESTION_BANK[i]);
  }
  // Pick 1 scenario
  picked.push(scenarios[0] || GENERIC_QUESTION_BANK[3]);
  // Pick 1 behavioral
  picked.push(behaviorals[0] || GENERIC_QUESTION_BANK[4]);

  return {
    questions: picked.slice(0, 5).map((p, idx) => ({
      questionIndex: idx,
      questionType: p.type,
      questionText: p.question,
      skillTested: p.skill,
    })),
    source: 'fallback',
  };
}

export function evaluateAnswerFallback(
  targetRole: string,
  questionType: QuestionType,
  questionText: string,
  userAnswer: string
): AnswerEvaluation {
  const trimmed = userAnswer.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const lower = trimmed.toLowerCase();

  // Handle empty or one-word answers: score 1-3 with constructive feedback
  if (wordCount < 4 || trimmed.length < 20) {
    return {
      score: wordCount <= 1 ? 1 : 2,
      strengths: [
        `You attempted a response and identified the topic keyword "${trimmed.slice(0, 30)}".`,
      ],
      improvements: [
        'Your answer is extremely brief or single-worded. In technical interviews, provide context, mechanisms, and examples.',
        'Explain the "why" and "how", not just a name or buzzword.',
        questionType === 'behavioral'
          ? 'Use the STAR method (Situation, Task, Action, Result) to tell a structured story.'
          : 'Define the term, explain how it operates in practice, and contrast it with alternatives.',
      ],
      improvedSampleAnswer: `A comprehensive answer for this ${questionType} question on ${targetRole} should explain the core concept, mechanism, and a concrete example. For example: "${questionText.includes('JavaScript') ? 'Undefined represents an uninitialized variable, while null represents intentional absence of value...' : 'In my experience, I break the problem down into actionable steps...'}"`,
      source: 'fallback',
    };
  }

  // Find relevant bank item for expected keywords and high-quality model answer
  const allItems = [...QUESTION_BANKS['junior-frontend-developer'], ...QUESTION_BANKS['data-analyst'], ...GENERIC_QUESTION_BANK];
  const matched = allItems.find((item) => item.question.toLowerCase().slice(0, 25) === questionText.toLowerCase().slice(0, 25));

  const expectedKeywords = matched ? matched.expectedKeywords : ['process', 'solution', 'approach', 'implementation'];
  const matchedKeywords = expectedKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
  const keywordRatio = matchedKeywords.length / Math.max(1, expectedKeywords.length);

  // Deterministic scoring rubric:
  // Base score from word count depth:
  let depthScore = 4;
  if (wordCount >= 25 && wordCount < 50) depthScore = 6;
  else if (wordCount >= 50 && wordCount < 100) depthScore = 7;
  else if (wordCount >= 100) depthScore = 8;

  // Bonus for keyword coverage:
  let keywordBonus = 0;
  if (keywordRatio >= 0.5) keywordBonus = 1;
  if (keywordRatio >= 0.75) keywordBonus = 2;

  // Structure bonus: check for STAR markers if behavioral or code/mechanics if technical
  let structureBonus = 0;
  if (questionType === 'behavioral' && (lower.includes('situation') || lower.includes('result') || lower.includes('action') || lower.includes('learned'))) {
    structureBonus = 1;
  } else if (lower.includes('for example') || lower.includes('because') || lower.includes('specifically')) {
    structureBonus = 1;
  }

  const finalScore = Math.min(10, Math.max(3, depthScore + keywordBonus + structureBonus));

  const strengths: string[] = [
    `Clear communication and solid answer length (${wordCount} words provided).`,
  ];
  if (matchedKeywords.length > 0) {
    strengths.push(`Good technical terminology covered: ${matchedKeywords.slice(0, 3).join(', ')}.`);
  } else {
    strengths.push('Demonstrated practical thinking and direct engagement with the question.');
  }

  const improvements: string[] = [];
  const missingKws = expectedKeywords.filter((kw) => !lower.includes(kw.toLowerCase()));
  if (missingKws.length > 0) {
    improvements.push(`Could incorporate additional key concepts such as: ${missingKws.slice(0, 3).join(', ')}.`);
  }
  if (wordCount < 60) {
    improvements.push('Consider elaborating with a concrete real-world project example or edge case to show deeper mastery.');
  } else {
    improvements.push('Mention potential trade-offs or alternative architectural approaches to demonstrate seniority.');
  }

  return {
    score: finalScore,
    strengths,
    improvements,
    improvedSampleAnswer: matched?.modelAnswer || `When answering "${questionText}", a strong candidate clearly states the definition, provides the internal mechanism, and illustrates with a production example or lesson learned.`,
    source: 'fallback',
  };
}

export function generateSummaryFallback(
  targetRole: string,
  perQuestionScores: Array<{
    questionIndex: number;
    questionType: QuestionType;
    questionText: string;
    userAnswer: string | null;
    score: number;
  }>,
  missingSkills: string[]
): InterviewSummary {
  // Deterministic average
  const totalScore = perQuestionScores.reduce((acc, q) => acc + q.score, 0);
  const averageScore = Math.round((totalScore / Math.max(1, perQuestionScores.length)) * 10) / 10;

  const topStrengths: string[] = [
    `Consistent completion of all 5 questions across technical and behavioral scenarios for ${targetRole}.`,
    averageScore >= 7
      ? 'Strong technical foundation with clear explanation of mechanisms and workflows.'
      : 'Good willingness to attempt complex problem scenarios and engage with interview prompts.',
    'Clear logical structure and communication throughout the interview session.',
  ];

  const topWeaknesses: string[] = [
    'Can expand on edge cases, failure modes, and performance trade-offs during technical questions.',
    'Behavioral answers can benefit from tighter adherence to the STAR framework (Situation, Task, Action, Result).',
  ];
  if (missingSkills.length > 0) {
    topWeaknesses.push(`Identified skill gaps in: ${missingSkills.slice(0, 2).join(', ')}.`);
  } else {
    topWeaknesses.push('Could provide more quantitative metrics and concrete project impact in answers.');
  }

  const recommendedNextSteps = [
    {
      step: 'Review core conceptual principles and practice articulating technical trade-offs out loud.',
      skill: missingSkills[0] || 'Technical Fundamentals',
    },
    {
      step: 'Formulate 3 ready-to-use STAR stories from your college or personal projects highlighting problem resolution.',
      skill: 'Behavioral Interviews',
    },
    {
      step: 'Check your personalized Learning Plan for targeted practice tasks and mini-projects.',
      skill: missingSkills[1] || 'Hands-on Projects',
    },
  ];

  return {
    overallScore: averageScore,
    perQuestionScores,
    topStrengths,
    topWeaknesses,
    recommendedNextSteps,
    source: 'fallback',
  };
}
