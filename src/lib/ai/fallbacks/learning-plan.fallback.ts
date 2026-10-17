import type { MissingSkillItem } from '@/lib/schemas/gap-detector.schema';
import type { LearningPlanOutput, WeekPlan, PlanTaskItem } from '@/lib/schemas/learning-plan.schema';

// ── Per-skill task templates (specific, not generic) ─────────────────────────
// Each skill has a bespoke task description, mini-project, and free resources.
const SKILL_TASK_MAP: Record<
  string,
  { task: string; description: string; hours: number; resources: { title: string; url: string; type: 'article' | 'video' | 'course' | 'docs' | 'practice' | 'book' }[]; miniProject: string }
> = {
  TypeScript: {
    task: 'Learn TypeScript types, interfaces, and generics',
    description: 'Work through the official TypeScript Handbook to understand basic types, interfaces, type narrowing, and generics. Convert an existing JS project to TypeScript with strict mode enabled.',
    hours: 4,
    resources: [
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', type: 'docs' },
      { title: 'TypeScript in 100 Seconds – Fireship', url: 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA', type: 'video' },
    ],
    miniProject: 'Build a typed quiz app in React+TypeScript that stores scores in localStorage',
  },
  'Tailwind CSS': {
    task: 'Build a responsive layout with Tailwind CSS utility classes',
    description: 'Install Tailwind in a React project, learn the spacing/flex/grid utilities, and rebuild a UI card design using only Tailwind classes without writing any custom CSS.',
    hours: 3,
    resources: [
      { title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs/installation', type: 'docs' },
      { title: 'Tailwind Crash Course – Traversy Media', url: 'https://www.youtube.com/watch?v=UBOj6rqRUME', type: 'video' },
    ],
    miniProject: 'Design a responsive personal portfolio card with dark-mode toggle using only Tailwind',
  },
  Git: {
    task: 'Master Git branching, merging, and pull requests',
    description: 'Practise the Git workflow: create a repo, make branches, commit often, resolve a merge conflict, and open a pull request on GitHub.',
    hours: 2,
    resources: [
      { title: 'Git Handbook – GitHub', url: 'https://guides.github.com/introduction/git-handbook/', type: 'docs' },
      { title: 'Learn Git Branching (interactive)', url: 'https://learngitbranching.js.org/', type: 'practice' },
    ],
    miniProject: 'Collaborate on a shared GitHub repo by branching, submitting PRs, and reviewing a peer\'s code',
  },
  'Git & GitHub': {
    task: 'Master Git branching, merging, and pull requests',
    description: 'Practise the Git workflow: create a repo, make branches, commit often, resolve a merge conflict, and open a pull request on GitHub.',
    hours: 2,
    resources: [
      { title: 'Git Handbook – GitHub', url: 'https://guides.github.com/introduction/git-handbook/', type: 'docs' },
      { title: 'Learn Git Branching (interactive)', url: 'https://learngitbranching.js.org/', type: 'practice' },
    ],
    miniProject: 'Collaborate on a shared GitHub repo by branching, submitting PRs, and reviewing a peer\'s code',
  },
  'Next.js': {
    task: 'Build a multi-page app with Next.js App Router',
    description: 'Create a Next.js 14+ project using the App Router, add dynamic routes, fetch data with a Server Component, and deploy a preview on Vercel.',
    hours: 5,
    resources: [
      { title: 'Next.js Official Tutorial', url: 'https://nextjs.org/learn', type: 'course' },
      { title: 'Next.js App Router in 45 minutes', url: 'https://www.youtube.com/watch?v=wm5gMKuwSYk', type: 'video' },
    ],
    miniProject: 'Build a blog with Next.js App Router: MDX posts, dynamic routes, and a sitemap',
  },
  'Redux / Zustand': {
    task: 'Manage global state with Zustand',
    description: 'Install Zustand, create a global store for a shopping cart, and persist it to localStorage. Compare the pattern to useState to understand why global state helps.',
    hours: 3,
    resources: [
      { title: 'Zustand Docs', url: 'https://docs.pmnd.rs/zustand/getting-started/introduction', type: 'docs' },
      { title: 'Zustand Tutorial – Jack Herrington', url: 'https://www.youtube.com/watch?v=_ngCLZ5Iz-0', type: 'video' },
    ],
    miniProject: 'Build a multi-step checkout flow in React with Zustand managing cart and user state',
  },
  'REST APIs': {
    task: 'Fetch and display data from a public REST API',
    description: 'Use the Fetch API and React\'s useEffect to load data from a public API (e.g., GitHub or Open-Meteo), handle loading and error states, and display the results.',
    hours: 3,
    resources: [
      { title: 'Using Fetch – MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch', type: 'docs' },
      { title: 'REST API Crash Course – freeCodeCamp', url: 'https://www.youtube.com/watch?v=ByYqoevo9M0', type: 'video' },
    ],
    miniProject: 'Build a weather dashboard that calls the Open-Meteo API and shows forecasts with charts',
  },
  'Unit Testing (Jest/Vitest)': {
    task: 'Write unit tests with Vitest and React Testing Library',
    description: 'Set up Vitest in a React project, write tests for a utility function and a React component, and learn the AAA (Arrange–Act–Assert) pattern.',
    hours: 3,
    resources: [
      { title: 'Vitest Getting Started', url: 'https://vitest.dev/guide/', type: 'docs' },
      { title: 'React Testing Library Tutorial', url: 'https://www.youtube.com/watch?v=7dTTFW7yACQ', type: 'video' },
    ],
    miniProject: 'Add 80 % test coverage to a React counter and a string-utility module using Vitest',
  },
  'Web Accessibility (a11y)': {
    task: 'Audit and fix accessibility issues on a web page',
    description: 'Run axe-core or Lighthouse on a personal project, fix the top-5 WCAG 2.1 AA issues (missing alt text, colour contrast, keyboard traps), and add ARIA labels to interactive elements.',
    hours: 2,
    resources: [
      { title: 'web.dev Accessibility', url: 'https://web.dev/accessibility/', type: 'article' },
      { title: 'A11y Project Checklist', url: 'https://www.a11yproject.com/checklist/', type: 'practice' },
    ],
    miniProject: 'Rebuild a navigation menu to be fully keyboard-navigable and screen-reader friendly',
  },
  'Python (Pandas, NumPy)': {
    task: 'Data wrangling with Pandas and NumPy on a real dataset',
    description: 'Download a Kaggle CSV, load it with Pandas, clean missing values, compute groupby aggregations, and create a summary report.',
    hours: 5,
    resources: [
      { title: 'Pandas Getting Started', url: 'https://pandas.pydata.org/docs/getting_started/index.html', type: 'docs' },
      { title: 'Data Analysis with Python – freeCodeCamp', url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8', type: 'video' },
    ],
    miniProject: 'Analyse the Titanic dataset: clean data, compute survival rates by class/gender, and plot results',
  },
  'SQL (Joins, Aggregations)': {
    task: 'Write complex SQL queries with JOINs and window functions',
    description: 'Solve 20 real-world SQL problems on Mode or LeetCode covering INNER/LEFT JOIN, GROUP BY, HAVING, and ROW_NUMBER window function.',
    hours: 4,
    resources: [
      { title: 'SQLZoo Interactive Tutorials', url: 'https://sqlzoo.net/', type: 'practice' },
      { title: 'SQL Tutorial – W3Schools', url: 'https://www.w3schools.com/sql/', type: 'article' },
    ],
    miniProject: 'Build a sales reporting query set that produces weekly revenue, top-5 products, and churn metrics',
  },
  'Data Visualization (PowerBI / Tableau)': {
    task: 'Build an interactive dashboard in Power BI Desktop',
    description: 'Download Power BI Desktop (free), connect to a CSV, create bar/line/map visuals, add slicers, and publish to Power BI Service for sharing.',
    hours: 4,
    resources: [
      { title: 'Power BI Learning Path – Microsoft', url: 'https://docs.microsoft.com/en-us/learn/powerplatform/power-bi', type: 'course' },
      { title: 'Power BI Full Course – freeCodeCamp', url: 'https://www.youtube.com/watch?v=TmhQCQr_DCA', type: 'video' },
    ],
    miniProject: 'Create a Covid-19 or e-commerce sales dashboard with KPI cards, trend lines, and region filters',
  },
  'Excel / Google Sheets': {
    task: 'Master PivotTables, VLOOKUP, and array formulas',
    description: 'Using a sample sales dataset, create a PivotTable, write VLOOKUP/INDEX-MATCH formulas, and use SUMIFS to produce a monthly summary table.',
    hours: 3,
    resources: [
      { title: 'Excel Functions – Microsoft Support', url: 'https://support.microsoft.com/en-us/excel', type: 'docs' },
      { title: 'Excel for Beginners – freeCodeCamp', url: 'https://www.youtube.com/watch?v=Vl0H-qTclOg', type: 'video' },
    ],
    miniProject: 'Build a budget tracker in Google Sheets with PivotTable summary and conditional formatting alerts',
  },
  Node: {
    task: 'Build a REST API with Node.js and Express',
    description: 'Create an Express server with CRUD routes for a resource (e.g. books), add JSON body parsing, validate inputs, and test endpoints in Postman.',
    hours: 4,
    resources: [
      { title: 'Node.js Getting Started', url: 'https://nodejs.org/en/docs/guides/getting-started-guide', type: 'docs' },
      { title: 'Express.js Crash Course', url: 'https://www.youtube.com/watch?v=L72fhGm1tfE', type: 'video' },
    ],
    miniProject: 'Build a notes REST API with Express + SQLite that supports create, read, update, and delete',
  },
  Docker: {
    task: 'Containerise a Node.js app with Docker',
    description: 'Write a Dockerfile for a Node.js Express app, build the image, run a container, and use docker-compose to add a database service.',
    hours: 3,
    resources: [
      { title: 'Docker Getting Started', url: 'https://docs.docker.com/get-started/', type: 'docs' },
      { title: 'Docker Tutorial for Beginners – TechWorld', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', type: 'video' },
    ],
    miniProject: 'Dockerise a full-stack web app and run it with docker-compose (frontend + backend + database)',
  },
};

// ── Default fallback for unknown skills ──────────────────────────────────────
function getSkillTemplate(skillName: string, targetRole: string, hours: number) {
  return SKILL_TASK_MAP[skillName] ?? {
    task: `Study and practise ${skillName}`,
    description: `Research the fundamentals of ${skillName}, follow the official documentation or a beginner tutorial, and build a small demonstration project that applies what you learned.`,
    hours,
    resources: [
      { title: `${skillName} Official Docs`, url: 'https://developer.mozilla.org/en-US/', type: 'docs' as const },
      { title: `${skillName} freeCodeCamp Tutorial`, url: 'https://www.freecodecamp.org/', type: 'course' as const },
    ],
    miniProject: `Build a small ${targetRole} portfolio piece that demonstrates your ${skillName} ability`,
  };
}

// ── Build a specific fallback plan ───────────────────────────────────────────
export function generateFallbackLearningPlan(
  targetRole: string,
  missingSkills: MissingSkillItem[],
  matchedSkills: string[],
  durationWeeks: 2 | 4 | 8
): LearningPlanOutput {
  // Sort: High → Medium → Low
  const sorted = [...missingSkills].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.priority] - order[b.priority];
  });

  // Distribute skills across weeks
  const skillsPerWeek = Math.ceil(sorted.length / durationWeeks);
  const weeks: WeekPlan[] = [];

  for (let w = 0; w < durationWeeks; w++) {
    const weekSkills = sorted.slice(w * skillsPerWeek, (w + 1) * skillsPerWeek);
    if (weekSkills.length === 0 && w >= sorted.length) {
      // Extra weeks when plan is longer than gap count — use review tasks
      weeks.push({
        weekNumber: w + 1,
        theme: 'Portfolio & Interview Prep',
        focusSkills: matchedSkills.slice(0, 2),
        tasks: [
          {
            title: 'Polish your GitHub portfolio',
            description: 'Write clear README files for your top 3 projects: problem solved, tech stack, setup instructions, and a screenshot or demo link.',
            estimatedHours: 3,
            skillsCovered: ['Portfolio', 'Communication'],
            resources: [
              { title: 'How to Write a Good README – freeCodeCamp', url: 'https://www.freecodecamp.org/news/how-to-write-a-good-readme-file/', type: 'article' },
            ],
          },
          {
            title: 'Practise common interview questions',
            description: `Review the top 20 interview questions for ${targetRole} on LeetCode or InterviewBit and write out your answers.`,
            estimatedHours: 2,
            skillsCovered: ['Interview Prep'],
            resources: [
              { title: 'LeetCode', url: 'https://leetcode.com/', type: 'practice' },
              { title: 'InterviewBit', url: 'https://www.interviewbit.com/', type: 'practice' },
            ],
          },
        ],
        miniProject: `Build and deploy a combined showcase project that uses all the skills you've learned this plan`,
      });
      continue;
    }

    const weekSkillsToUse = weekSkills.length > 0 ? weekSkills : [sorted[sorted.length - 1]];
    const hoursPerSkill = Math.max(1, Math.round(10 / weekSkillsToUse.length));

    const tasks: PlanTaskItem[] = weekSkillsToUse.map((skill) => {
      const tpl = getSkillTemplate(skill.name, targetRole, hoursPerSkill);
      return {
        title: tpl.task,
        description: tpl.description,
        estimatedHours: tpl.hours,
        skillsCovered: [skill.name],
        resources: tpl.resources,
      };
    });

    // Add a practice/integration task
    tasks.push({
      title: `Build a mini project integrating ${weekSkillsToUse.map((s) => s.name).join(' + ')}`,
      description: weekSkillsToUse.length === 1
        ? getSkillTemplate(weekSkillsToUse[0].name, targetRole, 0).miniProject
        : `Create a project that combines ${weekSkillsToUse.map((s) => s.name).join(', ')} — upload it to GitHub with a README.`,
      estimatedHours: 3,
      skillsCovered: weekSkillsToUse.map((s) => s.name),
      resources: [],
    });

    const theme = weekSkillsToUse.length === 1
      ? `${weekSkillsToUse[0].name} Mastery`
      : weekSkillsToUse.map((s) => s.name.split(' ')[0]).join(' + ');

    weeks.push({
      weekNumber: w + 1,
      theme,
      focusSkills: weekSkillsToUse.map((s) => s.name),
      tasks,
      miniProject: getSkillTemplate(weekSkillsToUse[0].name, targetRole, 0).miniProject,
    });
  }

  return {
    targetRole,
    durationWeeks,
    weeks,
    overallGoal: `After ${durationWeeks} weeks you will have addressed the key skill gaps for ${targetRole} and built ${Math.min(durationWeeks, sorted.length)} portfolio projects ready to show in interviews.`,
    source: 'fallback',
  };
}
