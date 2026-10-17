export interface SeedRole {
  slug: string;
  title: string;
  category: 'Engineering' | 'Data & AI' | 'Design' | 'Product & QA';
  description: string;
  requiredSkills: string[];
  goodToHaveSkills: string[];
}

export const SEED_ROLES: SeedRole[] = [
  // 1. Frontend & Web
  {
    slug: 'junior-frontend-developer',
    title: 'Junior Frontend Developer',
    category: 'Engineering',
    description: 'Builds responsive, accessible, and high-performance user interfaces using modern web standards and React frameworks.',
    requiredSkills: ['HTML5', 'CSS3', 'JavaScript', 'React', 'TypeScript', 'Tailwind CSS', 'Git'],
    goodToHaveSkills: ['Next.js', 'Redux / Zustand', 'REST APIs', 'Unit Testing (Jest/Vitest)', 'Web Accessibility (a11y)'],
  },
  {
    slug: 'react-developer-fresher',
    title: 'React Developer (Fresher)',
    category: 'Engineering',
    description: 'Specializes in component-driven development with React, state management, and modern client-side architectures.',
    requiredSkills: ['JavaScript (ES6+)', 'React Hooks', 'JSX/TSX', 'CSS / Tailwind', 'Git & GitHub'],
    goodToHaveSkills: ['TypeScript', 'Next.js', 'React Query / TanStack', 'Axios / Fetch API', 'Vite'],
  },
  {
    slug: 'nextjs-fullstack-engineer',
    title: 'Next.js Full Stack Engineer',
    category: 'Engineering',
    description: 'Develops end-to-end web applications with Next.js App Router, serverless API routes, and database integrations.',
    requiredSkills: ['React', 'Next.js (App Router)', 'TypeScript', 'Tailwind CSS', 'Node.js', 'SQL / PostgreSQL', 'REST APIs'],
    goodToHaveSkills: ['Prisma / Drizzle ORM', 'Server Actions', 'Supabase', 'Vercel Deployment', 'Authentication (Auth.js)'],
  },
  {
    slug: 'junior-ui-engineer',
    title: 'Junior UI / Web Designer',
    category: 'Design',
    description: 'Bridges visual design and engineering by turning Figma prototypes into semantic, pixel-perfect web interfaces.',
    requiredSkills: ['Figma', 'HTML5', 'CSS3 / Sass', 'Tailwind CSS', 'Responsive Design', 'Design Systems'],
    goodToHaveSkills: ['JavaScript', 'Framer Motion', 'Adobe Illustrator', 'Micro-interactions', 'User Testing'],
  },

  // 2. Backend & Systems
  {
    slug: 'junior-backend-developer',
    title: 'Junior Backend Developer (Node.js)',
    category: 'Engineering',
    description: 'Designs and builds server-side microservices, secure RESTful APIs, and scalable relational/NoSQL databases.',
    requiredSkills: ['Node.js', 'Express.js', 'JavaScript / TypeScript', 'PostgreSQL / MySQL', 'RESTful API Design', 'Git'],
    goodToHaveSkills: ['Prisma ORM', 'Redis Caching', 'Docker Basics', 'JWT Authentication', 'Postman / API Testing'],
  },
  {
    slug: 'python-fastapi-engineer',
    title: 'Python Backend Engineer (FastAPI/Django)',
    category: 'Engineering',
    description: 'Builds high-performance backend web services, asynchronous pipelines, and data APIs in Python.',
    requiredSkills: ['Python 3', 'FastAPI or Django', 'SQL (PostgreSQL)', 'Pydantic / Zod', 'Git', 'REST APIs'],
    goodToHaveSkills: ['Celery / Task Queues', 'Docker', 'Pytest', 'AsyncIO', 'Redis'],
  },
  {
    slug: 'java-spring-boot-developer',
    title: 'Java Spring Boot Fresher',
    category: 'Engineering',
    description: 'Develops enterprise-grade backends using Java and Spring Boot ecosystem for large-scale transaction systems.',
    requiredSkills: ['Core Java (OOP, Collections)', 'Spring Boot', 'Hibernate / JPA', 'SQL / MySQL', 'Maven or Gradle', 'Git'],
    goodToHaveSkills: ['Microservices Basics', 'Spring Security', 'JUnit & Mockito', 'Docker', 'Kafka Basics'],
  },

  // 3. Full Stack
  {
    slug: 'full-stack-mern-developer',
    title: 'Full Stack MERN Developer',
    category: 'Engineering',
    description: 'Builds complete web applications utilizing MongoDB, Express.js, React, and Node.js.',
    requiredSkills: ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript (ES6+)', 'Tailwind CSS', 'Git'],
    goodToHaveSkills: ['TypeScript', 'Mongoose', 'JWT Authentication', 'REST APIs', 'Cloud Deployment (Render/Vercel)'],
  },

  // 4. Data & AI
  {
    slug: 'data-analyst-intern',
    title: 'Data Analyst Intern',
    category: 'Data & AI',
    description: 'Extracts insights from structured data, performs statistical analysis, and creates executive dashboards.',
    requiredSkills: ['SQL (Joins, Aggregations)', 'Python (Pandas, NumPy)', 'Excel / Google Sheets', 'Data Visualization (PowerBI / Tableau)'],
    goodToHaveSkills: ['Matplotlib / Seaborn', 'Exploratory Data Analysis (EDA)', 'Statistics Basics', 'Business Communication'],
  },
  {
    slug: 'junior-data-scientist',
    title: 'Junior Data Scientist',
    category: 'Data & AI',
    description: 'Builds predictive models, cleans messy datasets, and deploys machine learning solutions.',
    requiredSkills: ['Python', 'SQL', 'Scikit-Learn', 'Pandas & NumPy', 'Statistics & Probability', 'Jupyter Notebooks'],
    goodToHaveSkills: ['TensorFlow / PyTorch Basics', 'Feature Engineering', 'Model Evaluation', 'Git', 'Data Storytelling'],
  },
  {
    slug: 'ai-ml-intern',
    title: 'AI / ML Engineer Intern',
    category: 'Data & AI',
    description: 'Explores large language models, computer vision, or NLP and integrates generative AI into software applications.',
    requiredSkills: ['Python', 'PyTorch or TensorFlow', 'Prompt Engineering / LLM APIs (Gemini/OpenAI)', 'Git', 'Data Preprocessing'],
    goodToHaveSkills: ['LangChain / LlamaIndex', 'Hugging Face', 'Vector Databases (Chroma/Pinecone)', 'RAG Architecture'],
  },
  {
    slug: 'bi-engineer-trainee',
    title: 'Business Intelligence Trainee',
    category: 'Data & AI',
    description: 'Designs ETL data pipelines, data warehouses, and interactive reporting dashboards for business stakeholders.',
    requiredSkills: ['Advanced SQL', 'Power BI / Tableau', 'Data Modeling (Star Schema)', 'Excel (Power Query)'],
    goodToHaveSkills: ['Python', 'Snowflake / BigQuery Basics', 'ETL Tools', 'DAX Formulas'],
  },

  // 5. Cloud & DevOps
  {
    slug: 'cloud-support-associate',
    title: 'Cloud Support Associate (AWS/Azure)',
    category: 'Engineering',
    description: 'Assists with cloud infrastructure provisioning, virtual networks, compute instances, and basic monitoring.',
    requiredSkills: ['Cloud Fundamentals (AWS or Azure)', 'Linux Command Line (Bash)', 'Networking Basics (DNS, TCP/IP, VPC)', 'Git'],
    goodToHaveSkills: ['AWS EC2 & S3', 'Terraform Basics', 'Python / Bash Scripting', 'IAM Security Policies'],
  },
  {
    slug: 'devops-engineer-fresher',
    title: 'DevOps Engineer (Fresher)',
    category: 'Engineering',
    description: 'Automates software delivery with CI/CD pipelines, containerization, and infrastructure monitoring.',
    requiredSkills: ['Linux / Shell Scripting', 'Git & GitHub Actions', 'Docker Basics', 'Networking & Security Fundamentals'],
    goodToHaveSkills: ['Kubernetes Basics', 'Terraform', 'Prometheus & Grafana', 'AWS / Cloud Hosting', 'YAML Configuration'],
  },

  // 6. QA & Testing
  {
    slug: 'qa-automation-engineer-intern',
    title: 'QA Automation Engineer Intern',
    category: 'Product & QA',
    description: 'Writes automated end-to-end and API tests to safeguard web application reliability and user experience.',
    requiredSkills: ['JavaScript / Python / Java', 'Manual Testing & Test Case Design', 'Selenium or Playwright / Cypress', 'Git'],
    goodToHaveSkills: ['Postman / Newman', 'API Testing', 'Bug Reporting (Jira)', 'CI/CD Test Integration', 'BDD (Cucumber)'],
  },
  {
    slug: 'qa-manual-tester',
    title: 'Software Test Engineer (Manual / QA)',
    category: 'Product & QA',
    description: 'Performs functional, regression, and cross-browser testing across web and mobile platforms.',
    requiredSkills: ['Software Testing Life Cycle (STLC)', 'Test Case Writing', 'Bug Tracking (Jira/Bugzilla)', 'API Testing with Postman'],
    goodToHaveSkills: ['Basic SQL Queries', 'Agile / Scrum Methodologies', 'Performance Testing Basics', 'Chrome DevTools'],
  },

  // 7. Mobile Development
  {
    slug: 'react-native-developer-fresher',
    title: 'React Native Mobile Developer',
    category: 'Engineering',
    description: 'Builds cross-platform iOS and Android mobile applications using React Native and Expo.',
    requiredSkills: ['JavaScript / TypeScript', 'React & React Native', 'Expo', 'Mobile UI Design', 'Git'],
    goodToHaveSkills: ['Redux / Zustand', 'REST API Integration', 'Native Device APIs (Camera, Location)', 'App Store Deployment Basics'],
  },
  {
    slug: 'flutter-developer-intern',
    title: 'Flutter App Developer Intern',
    category: 'Engineering',
    description: 'Develops expressive mobile applications with Dart and the Flutter framework.',
    requiredSkills: ['Dart Language', 'Flutter Widgets & State Management', 'Object-Oriented Programming', 'Git'],
    goodToHaveSkills: ['Provider / Bloc / Riverpod', 'Firebase Integration', 'REST APIs', 'Cross-Platform Testing'],
  },
  {
    slug: 'android-developer-kotlin',
    title: 'Android Developer (Kotlin Fresher)',
    category: 'Engineering',
    description: 'Creates modern native Android applications using Kotlin, Jetpack Compose, and Material Design.',
    requiredSkills: ['Kotlin', 'Android Studio', 'Jetpack Compose or XML Views', 'OOP & Data Structures', 'Git'],
    goodToHaveSkills: ['Coroutines & Flow', 'Retrofit (Networking)', 'Room Database', 'MVVM Architecture'],
  },

  // 8. Cybersecurity & IT
  {
    slug: 'cybersecurity-analyst-trainee',
    title: 'Cybersecurity Analyst Trainee',
    category: 'Engineering',
    description: 'Monitors security events, identifies vulnerabilities, and supports incident response workflows.',
    requiredSkills: ['Networking Fundamentals (OSI, TCP/IP)', 'Linux & Windows Security', 'OWASP Top 10 Web Vulnerabilities', 'Basic Python/Bash'],
    goodToHaveSkills: ['Wireshark', 'Burp Suite Basics', 'Nmap Scanning', 'Security Information & Event Management (SIEM)'],
  },

  // 9. Product & Management
  {
    slug: 'associate-product-manager',
    title: 'Associate Product Manager (APM Intern)',
    category: 'Product & QA',
    description: 'Collaborates with design and engineering to define feature requirements, user stories, and product roadmaps.',
    requiredSkills: ['Product Requirements Documents (PRDs)', 'User Research & Wireframing', 'Agile / Scrum', 'Data Analysis (SQL / Analytics)'],
    goodToHaveSkills: ['Figma Basics', 'A/B Testing Concepts', 'User Journey Mapping', 'Product Metrics (Retention, Activation)'],
  },
  {
    slug: 'technical-support-engineer',
    title: 'Technical Support Engineer',
    category: 'Engineering',
    description: 'Troubleshoots complex technical issues for customers, triages software bugs, and communicates with engineering.',
    requiredSkills: ['Operating Systems (Linux/Windows)', 'Database Queries (SQL)', 'API Troubleshooting (cURL/Postman)', 'Customer Empathy'],
    goodToHaveSkills: ['Log Analysis (Datadog/CloudWatch)', 'Basic Scripting (Python/Bash)', 'Ticketing Systems (Zendesk/Jira)'],
  },
  {
    slug: 'database-administrator-trainee',
    title: 'Database Administrator Trainee',
    category: 'Engineering',
    description: 'Monitors database health, manages backups, creates schemas, and tunes relational queries.',
    requiredSkills: ['Relational Database Concepts (RDBMS)', 'SQL (DDL, DML, DCL)', 'PostgreSQL or MySQL', 'Linux Basics'],
    goodToHaveSkills: ['Query Optimization (EXPLAIN)', 'Backup & Recovery Automation', 'Database Indexing Strategies', 'NoSQL Basics'],
  },
  {
    slug: 'technical-writer-software',
    title: 'Technical Writer (Software & APIs)',
    category: 'Product & QA',
    description: 'Produces developer documentation, API references, tutorials, and release notes for software products.',
    requiredSkills: ['Technical Writing', 'Markdown & Git', 'API Documentation (OpenAPI/Swagger)', 'HTML/CSS Basics'],
    goodToHaveSkills: ['Sample Code in JS/Python', 'Documentation Tools (Docusaurus/GitBook)', 'Developer Experience (DX)'],
  },
  {
    slug: 'salesforce-developer-trainee',
    title: 'Salesforce Developer Trainee',
    category: 'Engineering',
    description: 'Configures and customizes Salesforce CRM using Apex, Lightning Web Components (LWC), and workflows.',
    requiredSkills: ['OOP Concepts (Java/C#)', 'JavaScript Basics', 'Relational Databases (SQL/SOQL)', 'Web Fundamentals'],
    goodToHaveSkills: ['Salesforce Admin Basics', 'Apex Triggers', 'Lightning Web Components', 'Trailhead Badges'],
  },
];
