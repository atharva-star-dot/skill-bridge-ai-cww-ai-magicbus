-- ==============================================================================
-- 01_schema.sql — Core Database Schema
-- Generated from Prisma schema and enhanced for Supabase PostgreSQL
-- Idempotent: safe to run multiple times
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table (user profile linked directly to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    target_role TEXT,
    current_skills TEXT NOT NULL DEFAULT '[]',
    readiness_score INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was already created
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_role TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_skills TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS readiness_score INTEGER;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Target Roles Table (Curated reference roles)
CREATE TABLE IF NOT EXISTS public.target_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT NOT NULL,
    good_to_have_skills TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Skill Gap Reports Table (User-owned root table)
CREATE TABLE IF NOT EXISTS public.skill_gap_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    skills_hash TEXT,
    readiness_score INTEGER NOT NULL,
    matched_skills TEXT NOT NULL,
    missing_skills TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Learning Plans Table (User-owned root table)
CREATE TABLE IF NOT EXISTS public.learning_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Plan Tasks Table (Child table of learning_plans)
CREATE TABLE IF NOT EXISTS public.plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.learning_plans(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_hours DOUBLE PRECISION NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    resources TEXT NOT NULL DEFAULT '[]'
);

-- 6. Resume Reviews Table (User-owned root table)
CREATE TABLE IF NOT EXISTS public.resume_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    resume_text TEXT,
    ats_score INTEGER NOT NULL,
    strengths TEXT NOT NULL,
    weaknesses TEXT NOT NULL,
    missing_keywords TEXT NOT NULL,
    bullet_rewrites TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Interview Sessions Table (User-owned root table)
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_question_index INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Interview Answers Table (Child table of interview_sessions)
CREATE TABLE IF NOT EXISTS public.interview_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    user_answer TEXT,
    score INTEGER,
    feedback TEXT,
    sample_answer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Job Roles Table (Curated reference entry-level jobs)
CREATE TABLE IF NOT EXISTS public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    salary_range TEXT NOT NULL,
    skills TEXT NOT NULL,
    apply_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and isolation
CREATE UNIQUE INDEX IF NOT EXISTS "target_roles_slug_key" ON public.target_roles(slug);

CREATE INDEX IF NOT EXISTS "skill_gap_reports_user_id_idx" ON public.skill_gap_reports(user_id);
CREATE INDEX IF NOT EXISTS "skill_gap_reports_user_id_target_role_idx" ON public.skill_gap_reports(user_id, target_role);

CREATE INDEX IF NOT EXISTS "learning_plans_user_id_idx" ON public.learning_plans(user_id);
CREATE INDEX IF NOT EXISTS "learning_plans_user_id_target_role_idx" ON public.learning_plans(user_id, target_role);

CREATE INDEX IF NOT EXISTS "plan_tasks_plan_id_week_number_idx" ON public.plan_tasks(plan_id, week_number);

CREATE INDEX IF NOT EXISTS "resume_reviews_user_id_idx" ON public.resume_reviews(user_id);
CREATE INDEX IF NOT EXISTS "resume_reviews_user_id_target_role_idx" ON public.resume_reviews(user_id, target_role);

CREATE INDEX IF NOT EXISTS "interview_sessions_user_id_idx" ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS "interview_sessions_user_id_target_role_idx" ON public.interview_sessions(user_id, target_role);

CREATE INDEX IF NOT EXISTS "interview_answers_session_question_idx" ON public.interview_answers(interview_session_id, question_index);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
grant select, update on public.profiles to authenticated;
-- ==============================================================================
-- 03_seed.sql — Production Seed Data
-- Curated Entry-Level Tech Roles (25) & Indian Tech Jobs (40)
-- Idempotent: ON CONFLICT DO NOTHING
-- ==============================================================================

-- 1. Seed Target Roles (25 entry-level roles)
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000001', 'junior-frontend-developer', 'Junior Frontend Developer', 'Engineering', 'Builds responsive, accessible, and high-performance user interfaces using modern web standards and React frameworks.', '["HTML5","CSS3","JavaScript","React","TypeScript","Tailwind CSS","Git"]', '["Next.js","Redux / Zustand","REST APIs","Unit Testing (Jest/Vitest)","Web Accessibility (a11y)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000002', 'react-developer-fresher', 'React Developer (Fresher)', 'Engineering', 'Specializes in component-driven development with React, state management, and modern client-side architectures.', '["JavaScript (ES6+)","React Hooks","JSX/TSX","CSS / Tailwind","Git & GitHub"]', '["TypeScript","Next.js","React Query / TanStack","Axios / Fetch API","Vite"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000003', 'nextjs-fullstack-engineer', 'Next.js Full Stack Engineer', 'Engineering', 'Develops end-to-end web applications with Next.js App Router, serverless API routes, and database integrations.', '["React","Next.js (App Router)","TypeScript","Tailwind CSS","Node.js","SQL / PostgreSQL","REST APIs"]', '["Prisma / Drizzle ORM","Server Actions","Supabase","Vercel Deployment","Authentication (Auth.js)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000004', 'junior-ui-engineer', 'Junior UI / Web Designer', 'Design', 'Bridges visual design and engineering by turning Figma prototypes into semantic, pixel-perfect web interfaces.', '["Figma","HTML5","CSS3 / Sass","Tailwind CSS","Responsive Design","Design Systems"]', '["JavaScript","Framer Motion","Adobe Illustrator","Micro-interactions","User Testing"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000005', 'junior-backend-developer', 'Junior Backend Developer (Node.js)', 'Engineering', 'Designs and builds server-side microservices, secure RESTful APIs, and scalable relational/NoSQL databases.', '["Node.js","Express.js","JavaScript / TypeScript","PostgreSQL / MySQL","RESTful API Design","Git"]', '["Prisma ORM","Redis Caching","Docker Basics","JWT Authentication","Postman / API Testing"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000006', 'python-fastapi-engineer', 'Python Backend Engineer (FastAPI/Django)', 'Engineering', 'Builds high-performance backend web services, asynchronous pipelines, and data APIs in Python.', '["Python 3","FastAPI or Django","SQL (PostgreSQL)","Pydantic / Zod","Git","REST APIs"]', '["Celery / Task Queues","Docker","Pytest","AsyncIO","Redis"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000007', 'java-spring-boot-developer', 'Java Spring Boot Fresher', 'Engineering', 'Develops enterprise-grade backends using Java and Spring Boot ecosystem for large-scale transaction systems.', '["Core Java (OOP, Collections)","Spring Boot","Hibernate / JPA","SQL / MySQL","Maven or Gradle","Git"]', '["Microservices Basics","Spring Security","JUnit & Mockito","Docker","Kafka Basics"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000008', 'full-stack-mern-developer', 'Full Stack MERN Developer', 'Engineering', 'Builds complete web applications utilizing MongoDB, Express.js, React, and Node.js.', '["MongoDB","Express.js","React","Node.js","JavaScript (ES6+)","Tailwind CSS","Git"]', '["TypeScript","Mongoose","JWT Authentication","REST APIs","Cloud Deployment (Render/Vercel)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000009', 'data-analyst-intern', 'Data Analyst Intern', 'Data & AI', 'Extracts insights from structured data, performs statistical analysis, and creates executive dashboards.', '["SQL (Joins, Aggregations)","Python (Pandas, NumPy)","Excel / Google Sheets","Data Visualization (PowerBI / Tableau)"]', '["Matplotlib / Seaborn","Exploratory Data Analysis (EDA)","Statistics Basics","Business Communication"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000010', 'junior-data-scientist', 'Junior Data Scientist', 'Data & AI', 'Builds predictive models, cleans messy datasets, and deploys machine learning solutions.', '["Python","SQL","Scikit-Learn","Pandas & NumPy","Statistics & Probability","Jupyter Notebooks"]', '["TensorFlow / PyTorch Basics","Feature Engineering","Model Evaluation","Git","Data Storytelling"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000011', 'ai-ml-intern', 'AI / ML Engineer Intern', 'Data & AI', 'Explores large language models, computer vision, or NLP and integrates generative AI into software applications.', '["Python","PyTorch or TensorFlow","Prompt Engineering / LLM APIs (Gemini/OpenAI)","Git","Data Preprocessing"]', '["LangChain / LlamaIndex","Hugging Face","Vector Databases (Chroma/Pinecone)","RAG Architecture"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000012', 'bi-engineer-trainee', 'Business Intelligence Trainee', 'Data & AI', 'Designs ETL data pipelines, data warehouses, and interactive reporting dashboards for business stakeholders.', '["Advanced SQL","Power BI / Tableau","Data Modeling (Star Schema)","Excel (Power Query)"]', '["Python","Snowflake / BigQuery Basics","ETL Tools","DAX Formulas"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000013', 'cloud-support-associate', 'Cloud Support Associate (AWS/Azure)', 'Engineering', 'Assists with cloud infrastructure provisioning, virtual networks, compute instances, and basic monitoring.', '["Cloud Fundamentals (AWS or Azure)","Linux Command Line (Bash)","Networking Basics (DNS, TCP/IP, VPC)","Git"]', '["AWS EC2 & S3","Terraform Basics","Python / Bash Scripting","IAM Security Policies"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000014', 'devops-engineer-fresher', 'DevOps Engineer (Fresher)', 'Engineering', 'Automates software delivery with CI/CD pipelines, containerization, and infrastructure monitoring.', '["Linux / Shell Scripting","Git & GitHub Actions","Docker Basics","Networking & Security Fundamentals"]', '["Kubernetes Basics","Terraform","Prometheus & Grafana","AWS / Cloud Hosting","YAML Configuration"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000015', 'qa-automation-engineer-intern', 'QA Automation Engineer Intern', 'Product & QA', 'Writes automated end-to-end and API tests to safeguard web application reliability and user experience.', '["JavaScript / Python / Java","Manual Testing & Test Case Design","Selenium or Playwright / Cypress","Git"]', '["Postman / Newman","API Testing","Bug Reporting (Jira)","CI/CD Test Integration","BDD (Cucumber)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000016', 'qa-manual-tester', 'Software Test Engineer (Manual / QA)', 'Product & QA', 'Performs functional, regression, and cross-browser testing across web and mobile platforms.', '["Software Testing Life Cycle (STLC)","Test Case Writing","Bug Tracking (Jira/Bugzilla)","API Testing with Postman"]', '["Basic SQL Queries","Agile / Scrum Methodologies","Performance Testing Basics","Chrome DevTools"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000017', 'react-native-developer-fresher', 'React Native Mobile Developer', 'Engineering', 'Builds cross-platform iOS and Android mobile applications using React Native and Expo.', '["JavaScript / TypeScript","React & React Native","Expo","Mobile UI Design","Git"]', '["Redux / Zustand","REST API Integration","Native Device APIs (Camera, Location)","App Store Deployment Basics"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000018', 'flutter-developer-intern', 'Flutter App Developer Intern', 'Engineering', 'Develops expressive mobile applications with Dart and the Flutter framework.', '["Dart Language","Flutter Widgets & State Management","Object-Oriented Programming","Git"]', '["Provider / Bloc / Riverpod","Firebase Integration","REST APIs","Cross-Platform Testing"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000019', 'android-developer-kotlin', 'Android Developer (Kotlin Fresher)', 'Engineering', 'Creates modern native Android applications using Kotlin, Jetpack Compose, and Material Design.', '["Kotlin","Android Studio","Jetpack Compose or XML Views","OOP & Data Structures","Git"]', '["Coroutines & Flow","Retrofit (Networking)","Room Database","MVVM Architecture"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000020', 'cybersecurity-analyst-trainee', 'Cybersecurity Analyst Trainee', 'Engineering', 'Monitors security events, identifies vulnerabilities, and supports incident response workflows.', '["Networking Fundamentals (OSI, TCP/IP)","Linux & Windows Security","OWASP Top 10 Web Vulnerabilities","Basic Python/Bash"]', '["Wireshark","Burp Suite Basics","Nmap Scanning","Security Information & Event Management (SIEM)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000021', 'associate-product-manager', 'Associate Product Manager (APM Intern)', 'Product & QA', 'Collaborates with design and engineering to define feature requirements, user stories, and product roadmaps.', '["Product Requirements Documents (PRDs)","User Research & Wireframing","Agile / Scrum","Data Analysis (SQL / Analytics)"]', '["Figma Basics","A/B Testing Concepts","User Journey Mapping","Product Metrics (Retention, Activation)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000022', 'technical-support-engineer', 'Technical Support Engineer', 'Engineering', 'Troubleshoots complex technical issues for customers, triages software bugs, and communicates with engineering.', '["Operating Systems (Linux/Windows)","Database Queries (SQL)","API Troubleshooting (cURL/Postman)","Customer Empathy"]', '["Log Analysis (Datadog/CloudWatch)","Basic Scripting (Python/Bash)","Ticketing Systems (Zendesk/Jira)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000023', 'database-administrator-trainee', 'Database Administrator Trainee', 'Engineering', 'Monitors database health, manages backups, creates schemas, and tunes relational queries.', '["Relational Database Concepts (RDBMS)","SQL (DDL, DML, DCL)","PostgreSQL or MySQL","Linux Basics"]', '["Query Optimization (EXPLAIN)","Backup & Recovery Automation","Database Indexing Strategies","NoSQL Basics"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000024', 'technical-writer-software', 'Technical Writer (Software & APIs)', 'Product & QA', 'Produces developer documentation, API references, tutorials, and release notes for software products.', '["Technical Writing","Markdown & Git","API Documentation (OpenAPI/Swagger)","HTML/CSS Basics"]', '["Sample Code in JS/Python","Documentation Tools (Docusaurus/GitBook)","Developer Experience (DX)"]') ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) VALUES ('00000000-0000-0000-0001-000000000025', 'salesforce-developer-trainee', 'Salesforce Developer Trainee', 'Engineering', 'Configures and customizes Salesforce CRM using Apex, Lightning Web Components (LWC), and workflows.', '["OOP Concepts (Java/C#)","JavaScript Basics","Relational Databases (SQL/SOQL)","Web Fundamentals"]', '["Salesforce Admin Basics","Apex Triggers","Lightning Web Components","Trailhead Badges"]') ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Job Roles (40 verified Indian tech fresher jobs)
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000001', 'Junior Frontend Engineer', 'Razorpay', 'Bengaluru (Hybrid)', 'Fresher / 0-1 yr', '₹8.0 - ₹12.0 LPA', '["React","TypeScript","Tailwind CSS","JavaScript","HTML5","CSS3","Git"]', 'https://razorpay.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000002', 'React Developer (Intern)', 'CRED', 'Bengaluru (Onsite)', 'Internship', '₹40,000 / month', '["React","JavaScript (ES6+)","CSS / Tailwind","Git & GitHub"]', 'https://careers.cred.club') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000003', 'Associate Web Developer', 'Zoho Corporation', 'Chennai / Tenkasi', 'Fresher (0 yrs)', '₹5.5 - ₹7.0 LPA', '["HTML5","CSS3","JavaScript","React","Git"]', 'https://www.zoho.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000004', 'Full Stack Developer Intern', 'Postman', 'Bengaluru / Remote', 'Internship', '₹45,000 / month', '["Node.js","React","JavaScript","TypeScript","REST APIs","Git"]', 'https://www.postman.com/company/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000005', 'Junior Full Stack MERN Engineer', 'Groww', 'Bengaluru (Hybrid)', '0-1 yr', '₹7.5 - ₹11.0 LPA', '["MongoDB","Express.js","React","Node.js","JavaScript","Tailwind CSS"]', 'https://groww.in/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000006', 'Next.js Frontend Developer', 'Zepto', 'Mumbai (Onsite)', 'Fresher / 0-1 yr', '₹6.0 - ₹9.0 LPA', '["Next.js (App Router)","React","TypeScript","Tailwind CSS","Git"]', 'https://www.zeptonow.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000007', 'Graduate Trainee Engineer - UI', 'TCS Digital', 'Pune / Hyderabad', 'Fresher', '₹7.0 - ₹7.5 LPA', '["HTML5","CSS3","JavaScript","React","Git"]', 'https://www.tcs.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000008', 'Frontend Engineer - Entry Level', 'Swiggy', 'Remote (India)', '0-1 yr', '₹9.0 - ₹13.0 LPA', '["React","JavaScript","TypeScript","Tailwind CSS","Web Accessibility (a11y)"]', 'https://careers.swiggy.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000009', 'Junior Web Engineer', 'Freshworks', 'Chennai (Hybrid)', 'Fresher / 0-1 yr', '₹6.5 - ₹8.5 LPA', '["JavaScript","HTML5","CSS3","React","REST APIs","Git"]', 'https://www.freshworks.com/company/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000010', 'Full Stack Engineer (MERN)', 'Urban Company', 'Gurgaon (Hybrid)', '0-1 yr', '₹8.0 - ₹12.0 LPA', '["Node.js","Express.js","React","MongoDB","JavaScript (ES6+)"]', 'https://www.urbancompany.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000011', 'Junior Node.js Backend Developer', 'Jio Platforms', 'Navi Mumbai / Bengaluru', 'Fresher / 0-1 yr', '₹5.5 - ₹7.5 LPA', '["Node.js","Express.js","JavaScript / TypeScript","PostgreSQL / MySQL","RESTful API Design","Git"]', 'https://careers.jio.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000012', 'Backend Developer Trainee (Python)', 'InMobi', 'Bengaluru (Onsite)', 'Fresher', '₹7.0 - ₹10.0 LPA', '["Python 3","FastAPI or Django","SQL (PostgreSQL)","Git","REST APIs"]', 'https://www.inmobi.com/company/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000013', 'Junior Java Developer', 'Infosys (Specialist Programmer)', 'Bengaluru / Pune / Hyderabad', 'Fresher', '₹6.0 - ₹9.5 LPA', '["Core Java (OOP, Collections)","Spring Boot","Hibernate / JPA","SQL / MySQL","Git"]', 'https://www.infosys.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000014', 'Software Development Engineer - I (Backend)', 'PhonePe', 'Bengaluru (Onsite)', '0-1 yr', '₹12.0 - ₹16.0 LPA', '["Core Java (OOP, Collections)","Spring Boot","SQL / MySQL","REST APIs","Git"]', 'https://www.phonepe.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000015', 'Python API Developer Intern', 'Hike', 'Remote (India)', 'Internship', '₹35,000 / month', '["Python 3","FastAPI or Django","SQL (PostgreSQL)","Git"]', 'https://www.hike.in/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000016', 'Associate Software Engineer - Java', 'Accenture India', 'Hyderabad / Gurgaon', 'Fresher', '₹4.5 - ₹6.5 LPA', '["Core Java (OOP, Collections)","Spring Boot","SQL / MySQL","Git"]', 'https://www.accenture.com/in-en/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000017', 'Junior Backend Engineer (Go/Node)', 'Zerodha', 'Bengaluru (Hybrid)', '0-1 yr', '₹10.0 - ₹14.0 LPA', '["Node.js","PostgreSQL / MySQL","JavaScript / TypeScript","Git","Linux / Shell Scripting"]', 'https://zerodha.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000018', 'Backend Software Intern', 'Klaar Labs', 'Remote', 'Internship', '₹25,000 / month', '["Node.js","Express.js","JavaScript","MongoDB","Git"]', 'https://example.com/klaar') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000019', 'Junior Systems Software Engineer', 'Wipro Turbo', 'Bengaluru / Chennai', 'Fresher', '₹6.5 LPA', '["Core Java (OOP, Collections)","SQL / MySQL","Linux Basics","Git"]', 'https://careers.wipro.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000020', 'Node.js Developer (Fresher)', 'Dunzo Tech', 'Bengaluru (Hybrid)', '0-1 yr', '₹6.0 - ₹8.0 LPA', '["Node.js","Express.js","JavaScript","PostgreSQL / MySQL","Git"]', 'https://www.dunzo.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000021', 'Data Analyst Intern', 'Flipkart', 'Bengaluru (Hybrid)', 'Internship', '₹35,000 / month', '["SQL (Joins, Aggregations)","Python (Pandas, NumPy)","Excel / Google Sheets","Data Visualization (PowerBI / Tableau)"]', 'https://www.flipkartcareers.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000022', 'Junior Data Analyst', 'Mu Sigma', 'Bengaluru (Onsite)', 'Fresher', '₹5.0 - ₹7.0 LPA', '["SQL (Joins, Aggregations)","Python (Pandas, NumPy)","Excel / Google Sheets","Data Visualization (PowerBI / Tableau)"]', 'https://www.mu-sigma.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000023', 'AI / GenAI Intern', 'Fractal Analytics', 'Mumbai / Gurgaon', 'Internship', '₹30,000 / month', '["Python","Prompt Engineering / LLM APIs (Gemini/OpenAI)","PyTorch or TensorFlow","Git"]', 'https://fractal.ai/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000024', 'Junior Data Scientist', 'Tiger Analytics', 'Chennai / Hyderabad', 'Fresher / 0-1 yr', '₹7.5 - ₹10.5 LPA', '["Python","SQL","Scikit-Learn","Pandas & NumPy","Statistics & Probability"]', 'https://www.tigeranalytics.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000025', 'Business Intelligence Analyst', 'Delhivery', 'Gurgaon (Hybrid)', '0-1 yr', '₹6.0 - ₹8.5 LPA', '["Advanced SQL","Power BI / Tableau","Excel (Power Query)","Data Modeling (Star Schema)"]', 'https://www.delhivery.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000026', 'Machine Learning Trainee', 'LTI Mindtree', 'Pune / Mumbai', 'Fresher', '₹5.0 - ₹6.5 LPA', '["Python","SQL","Scikit-Learn","Pandas & NumPy","Git"]', 'https://www.ltimindtree.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000027', 'Junior Data Engineer', 'Meesho', 'Bengaluru (Hybrid)', '0-1 yr', '₹8.0 - ₹11.0 LPA', '["SQL (Joins, Aggregations)","Python","Linux / Shell Scripting","Git"]', 'https://meesho.io/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000028', 'Analytics Engineer Intern', 'Klub Works', 'Bengaluru / Remote', 'Internship', '₹25,000 / month', '["SQL (Joins, Aggregations)","Python (Pandas, NumPy)","Data Visualization (PowerBI / Tableau)"]', 'https://klubworks.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000029', 'Associate AI Engineer', 'Persistent Systems', 'Pune (Hybrid)', 'Fresher', '₹5.5 - ₹7.0 LPA', '["Python","Prompt Engineering / LLM APIs (Gemini/OpenAI)","Git","Data Preprocessing"]', 'https://www.persistent.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000030', 'Junior Analytics Consultant', 'LatentView Analytics', 'Chennai (Onsite)', 'Fresher / 0-1 yr', '₹6.0 - ₹7.5 LPA', '["SQL (Joins, Aggregations)","Excel / Google Sheets","Python (Pandas, NumPy)","Power BI / Tableau"]', 'https://www.latentview.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000031', 'Cloud Support Associate', 'Amazon Web Services (AWS)', 'Bengaluru / Hyderabad', 'Fresher / 0-1 yr', '₹11.0 - ₹15.0 LPA', '["Cloud Fundamentals (AWS or Azure)","Linux Command Line (Bash)","Networking Basics (DNS, TCP/IP, VPC)","Git"]', 'https://www.amazon.jobs') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000032', 'DevOps Engineer Trainee', 'Cognizant GenC Next', 'Chennai / Coimbatore', 'Fresher', '₹6.5 LPA', '["Linux / Shell Scripting","Git & GitHub Actions","Docker Basics","Networking & Security Fundamentals"]', 'https://careers.cognizant.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000033', 'QA Automation Engineer Intern', 'BrowserStack', 'Mumbai (Hybrid)', 'Internship', '₹35,000 / month', '["JavaScript / Python / Java","Manual Testing & Test Case Design","Selenium or Playwright / Cypress","Git"]', 'https://www.browserstack.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000034', 'Junior Mobile Developer (React Native)', 'Licious', 'Bengaluru (Onsite)', '0-1 yr', '₹6.0 - ₹8.5 LPA', '["JavaScript / TypeScript","React & React Native","Expo","Mobile UI Design","Git"]', 'https://www.licious.in/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000035', 'Flutter Developer Fresher', 'Pocket FM', 'Bengaluru (Hybrid)', 'Fresher / 0-1 yr', '₹6.0 - ₹9.0 LPA', '["Dart Language","Flutter Widgets & State Management","Object-Oriented Programming","Git"]', 'https://www.pocketfm.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000036', 'Software Test Engineer (Manual QA)', 'Capgemini India', 'Navi Mumbai / Pune', 'Fresher', '₹4.0 - ₹5.0 LPA', '["Software Testing Life Cycle (STLC)","Test Case Writing","Bug Tracking (Jira/Bugzilla)","API Testing with Postman"]', 'https://www.capgemini.com/in-en/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000037', 'Cybersecurity Analyst Trainee', 'Wipro CyberTech', 'Bengaluru / Hyderabad', 'Fresher', '₹5.0 - ₹6.5 LPA', '["Networking Fundamentals (OSI, TCP/IP)","Linux & Windows Security","OWASP Top 10 Web Vulnerabilities","Basic Python/Bash"]', 'https://careers.wipro.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000038', 'Android Developer Intern (Kotlin)', 'ShareChat', 'Bengaluru (Hybrid)', 'Internship', '₹35,000 / month', '["Kotlin","Android Studio","Jetpack Compose or XML Views","OOP & Data Structures","Git"]', 'https://sharechat.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000039', 'Associate Product Manager Intern', 'Unacademy', 'Bengaluru (Onsite)', 'Internship', '₹30,000 / month', '["Product Requirements Documents (PRDs)","User Research & Wireframing","Agile / Scrum","Data Analysis (SQL / Analytics)"]', 'https://unacademy.com/careers') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) VALUES ('00000000-0000-0000-0002-000000000040', 'Technical Support Associate', 'Dell Technologies', 'Gurgaon / Bengaluru', 'Fresher / 0-1 yr', '₹4.5 - ₹6.0 LPA', '["Operating Systems (Linux/Windows)","Database Queries (SQL)","API Troubleshooting (cURL/Postman)","Customer Empathy"]', 'https://jobs.dell.com') ON CONFLICT (id) DO NOTHING;
