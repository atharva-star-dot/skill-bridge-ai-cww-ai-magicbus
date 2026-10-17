import type { MissingSkillItem } from '@/lib/schemas/gap-detector.schema';
import type { LearningPlanOutput, WeekPlan, PlanTaskItem } from '@/lib/schemas/learning-plan.schema';

const SKILL_TASK_MAP: Record<
  string,
  {
    tasks: { title: string; description: string; hours: number; resources: { title: string; url: string; type: 'article' | 'video' | 'course' | 'docs' | 'practice' | 'book' }[] }[];
    miniProject: string;
  }
> = {
  TypeScript: {
    tasks: [
      {
        title: 'Master TypeScript Types & Interfaces',
        description: 'Study primitives, type aliases, interfaces, and union types. Understand when to use interface vs type alias.',
        hours: 3,
        resources: [
          { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', type: 'docs' },
          { title: 'TypeScript in 100 Seconds', url: 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA', type: 'video' },
        ],
      },
      {
        title: 'Practice Generics & Type Narrowing',
        description: 'Write generic functions, generic interfaces, and use type guards (typeof, instanceof, user-defined) safely.',
        hours: 3,
        resources: [
          { title: 'Generics Guide', url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html', type: 'docs' },
        ],
      },
      {
        title: 'Type React Components & Hooks',
        description: 'Define props interfaces, type useState and useRef hooks, and handle React synthetic events in TypeScript.',
        hours: 2,
        resources: [
          { title: 'React TypeScript Cheatsheet', url: 'https://react-typescript-cheatsheet.netlify.app/', type: 'docs' },
        ],
      },
    ],
    miniProject: 'Build a typed quiz application with score breakdown and typed local storage state',
  },
  Git: {
    tasks: [
      {
        title: 'Git Version Control Essentials',
        description: 'Learn initialization, staging, committing, and inspecting repository log histories.',
        hours: 2,
        resources: [
          { title: 'Git Handbook – GitHub', url: 'https://guides.github.com/introduction/git-handbook/', type: 'docs' },
        ],
      },
      {
        title: 'Branching, Rebasing & Resolving Conflicts',
        description: 'Create feature branches, perform fast-forward and 3-way merges, and resolve merge conflicts hands-on.',
        hours: 2,
        resources: [
          { title: 'Learn Git Branching (interactive)', url: 'https://learngitbranching.js.org/', type: 'practice' },
        ],
      },
      {
        title: 'GitHub PR Workflow & Code Reviews',
        description: 'Open clean Pull Requests with descriptive summaries, link issues, and review peer diffs on GitHub.',
        hours: 2,
        resources: [
          { title: 'GitHub PR Documentation', url: 'https://docs.github.com/en/pull-requests', type: 'docs' },
        ],
      },
    ],
    miniProject: 'Set up an open-source workflow repo with issue templates, branch protection, and a verified PR merge',
  },
  'Redux / Zustand': {
    tasks: [
      {
        title: 'Core State Management Concepts',
        description: 'Understand unidirectional data flow, global vs local state, and state immutability patterns.',
        hours: 2,
        resources: [
          { title: 'Zustand Docs', url: 'https://docs.pmnd.rs/zustand/getting-started/introduction', type: 'docs' },
        ],
      },
      {
        title: 'Build a Zustand Store with Selectors',
        description: 'Create stores with actions, immutable setters, and selective re-rendering subscriptions.',
        hours: 3,
        resources: [
          { title: 'Zustand Tutorial – Jack Herrington', url: 'https://www.youtube.com/watch?v=_ngCLZ5Iz-0', type: 'video' },
        ],
      },
      {
        title: 'Persist State & Async Actions',
        description: 'Add localStorage middleware persistence and handle asynchronous API fetches inside the store.',
        hours: 3,
        resources: [
          { title: 'Zustand Middleware', url: 'https://docs.pmnd.rs/zustand/integrations/persisting-store-data', type: 'docs' },
        ],
      },
    ],
    miniProject: 'Build an e-commerce shopping cart with global state, discount code logic, and local persistence',
  },
  'REST APIs': {
    tasks: [
      {
        title: 'REST Architecture & HTTP Verbs',
        description: 'Learn REST conventions, HTTP status codes (200, 201, 400, 404, 500), and request headers.',
        hours: 2,
        resources: [
          { title: 'REST API Tutorial', url: 'https://restfulapi.net/', type: 'article' },
        ],
      },
      {
        title: 'Fetch Data & Manage Loading/Error States',
        description: 'Implement robust API fetching with AbortController for race conditions and structured error handlers.',
        hours: 3,
        resources: [
          { title: 'Using Fetch – MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch', type: 'docs' },
        ],
      },
      {
        title: 'Pagination & Filtering Integration',
        description: 'Connect to a paginated public API, display query results, and implement debounced live search.',
        hours: 3,
        resources: [
          { title: 'REST API Crash Course – freeCodeCamp', url: 'https://www.youtube.com/watch?v=ByYqoevo9M0', type: 'video' },
        ],
      },
    ],
    miniProject: 'Build a live crypto or weather dashboard with search, auto-refresh, and error banner handling',
  },
  'Tailwind CSS': {
    tasks: [
      {
        title: 'Utility-First Styling & Responsive Design',
        description: 'Master mobile-first responsive breakpoints (sm, md, lg), spacing scales, and flex/grid layout helpers.',
        hours: 2,
        resources: [
          { title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs/installation', type: 'docs' },
        ],
      },
      {
        title: 'Dark Mode & Custom Theme Tokens',
        description: 'Configure custom colors and font families in tailwind.config and implement class-based dark mode toggling.',
        hours: 3,
        resources: [
          { title: 'Tailwind Dark Mode', url: 'https://tailwindcss.com/docs/dark-mode', type: 'docs' },
        ],
      },
      {
        title: 'Component Patterns & Animations',
        description: 'Build reusable modal, dropdown, and card patterns with transition and transform utilities.',
        hours: 2,
        resources: [
          { title: 'Tailwind Crash Course – Traversy Media', url: 'https://www.youtube.com/watch?v=UBOj6rqRUME', type: 'video' },
        ],
      },
    ],
    miniProject: 'Design a responsive marketing landing page with interactive dark mode and custom badge components',
  },
  'Next.js': {
    tasks: [
      {
        title: 'Next.js App Router Architecture',
        description: 'Understand file-system routing, layout nesting, loading.tsx, error.tsx, and not-found boundaries.',
        hours: 3,
        resources: [
          { title: 'Next.js Learn', url: 'https://nextjs.org/learn', type: 'course' },
        ],
      },
      {
        title: 'Server vs Client Components',
        description: 'Learn when to use Server Components for SEO and fast streaming vs Client Components for interactivity.',
        hours: 3,
        resources: [
          { title: 'Server Components Guide', url: 'https://nextjs.org/docs/app/building-your-application/rendering/server-components', type: 'docs' },
        ],
      },
      {
        title: 'Server Actions & Route Handlers',
        description: 'Build backend API routes in app/api and mutate data directly using Next.js Server Actions.',
        hours: 3,
        resources: [
          { title: 'Server Actions Tutorial', url: 'https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations', type: 'docs' },
        ],
      },
    ],
    miniProject: 'Build a production-ready documentation or job listing portal with dynamic routing and server rendering',
  },
  'Unit Testing (Jest/Vitest)': {
    tasks: [
      {
        title: 'Vitest / Jest Setup & Assertions',
        description: 'Configure Vitest test runner, write unit tests for pure utility functions, and master test matchers.',
        hours: 2,
        resources: [
          { title: 'Vitest Guide', url: 'https://vitest.dev/guide/', type: 'docs' },
        ],
      },
      {
        title: 'Testing React Components with RTL',
        description: 'Render components, query by role/text, simulate user events (clicks, typing), and assert DOM state.',
        hours: 3,
        resources: [
          { title: 'React Testing Library', url: 'https://testing-library.com/docs/react-testing-library/intro/', type: 'docs' },
        ],
      },
      {
        title: 'Mocking APIs & Custom Hooks',
        description: 'Mock global fetch or Axios calls and write unit tests for custom React hooks.',
        hours: 3,
        resources: [
          { title: 'Mock Service Worker (MSW)', url: 'https://mswjs.io/', type: 'docs' },
        ],
      },
    ],
    miniProject: 'Add 85%+ unit test coverage with Vitest and React Testing Library to an interactive form component',
  },
};

function getTasksForSkill(skillName: string, targetRole: string): { title: string; description: string; hours: number; resources: any[] }[] {
  // Direct match
  if (SKILL_TASK_MAP[skillName]) return SKILL_TASK_MAP[skillName].tasks;
  // Partial match
  const found = Object.keys(SKILL_TASK_MAP).find(
    (k) => skillName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(skillName.toLowerCase())
  );
  if (found && SKILL_TASK_MAP[found]) return SKILL_TASK_MAP[found].tasks;

  // Generic 3-task breakdown for unknown skill
  return [
    {
      title: `${skillName} Foundations & Principles`,
      description: `Study core syntax, principles, and industry conventions of ${skillName} for entry-level ${targetRole}.`,
      hours: 3,
      resources: [{ title: `${skillName} Documentation`, url: 'https://developer.mozilla.org/en-US/', type: 'docs' }],
    },
    {
      title: `Hands-on Practice with ${skillName}`,
      description: `Build focused code exercises applying ${skillName} in practical scenarios matching junior screening tests.`,
      hours: 3,
      resources: [{ title: `${skillName} Practice Guide`, url: 'https://www.freecodecamp.org/', type: 'course' }],
    },
    {
      title: `Integration & Code Quality for ${skillName}`,
      description: `Refactor code, handle edge cases, and integrate ${skillName} cleanly into a larger project structure.`,
      hours: 2,
      resources: [],
    },
  ];
}

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

  const skillsPerWeek = Math.max(1, Math.ceil(sorted.length / durationWeeks));
  const weeks: WeekPlan[] = [];

  for (let w = 0; w < durationWeeks; w++) {
    const isFinalWeek = w === durationWeeks - 1;
    const weekSkills = sorted.slice(w * skillsPerWeek, (w + 1) * skillsPerWeek);
    const focusSkills = weekSkills.length > 0 ? weekSkills.map((s) => s.name) : [sorted[sorted.length - 1]?.name || 'Problem Solving'];

    // Generate tasks (ensure 3-4 tasks per week)
    const taskList: PlanTaskItem[] = [];

    for (const skill of focusSkills) {
      const tasks = getTasksForSkill(skill, targetRole);
      for (const t of tasks) {
        if (taskList.length < 3) {
          taskList.push({
            title: t.title,
            description: t.description,
            estimatedHours: t.hours,
            skillsCovered: [skill],
            resources: t.resources || [],
          });
        }
      }
    }

    // Ensure at least 3 tasks per week
    while (taskList.length < 3) {
      const idx = taskList.length + 1;
      taskList.push({
        title: `Practical Exercise ${idx}: ${focusSkills.join(' + ')}`,
        description: `Apply your knowledge by solving realistic coding challenges related to ${focusSkills.join(', ')}.`,
        estimatedHours: 2,
        skillsCovered: focusSkills,
        resources: [],
      });
    }

    // Cap at 4 tasks
    const finalTasks = taskList.slice(0, 4);

    const theme = focusSkills.length === 1
      ? `${focusSkills[0]} Mastery`
      : `${focusSkills[0].split(' ')[0]} & ${focusSkills[1]?.split(' ')[0] || 'Core'} Skills`;

    const miniProject = isFinalWeek
      ? `Capstone Portfolio Project: Build and deploy a complete ${targetRole} application integrating all skills learned across the roadmap (with live URL and GitHub README).`
      : `Weekly Milestone: Complete an interactive practice component demonstrating ${focusSkills.join(' and ')}.`;

    weeks.push({
      weekNumber: w + 1,
      theme,
      focusSkills,
      tasks: finalTasks,
      miniProject,
    });
  }

  return {
    targetRole,
    durationWeeks,
    weeks,
    overallGoal: `After ${durationWeeks} weeks you will systematically close your high and medium priority skill gaps and build a deployable capstone portfolio project for ${targetRole} interviews.`,
    source: 'fallback',
  };
}
