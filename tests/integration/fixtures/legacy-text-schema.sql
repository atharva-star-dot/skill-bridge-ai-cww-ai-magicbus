CREATE SCHEMA auth;

CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $function$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$function$;

CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    target_role TEXT,
    current_skills TEXT NOT NULL DEFAULT '[]',
    readiness_score INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.target_roles (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT NOT NULL,
    good_to_have_skills TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.skill_gap_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_role TEXT NOT NULL,
    skills_hash TEXT,
    readiness_score INTEGER NOT NULL,
    matched_skills TEXT NOT NULL,
    missing_skills TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT skill_gap_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.learning_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_role TEXT NOT NULL,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT learning_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.plan_tasks (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_hours REAL NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    resources TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT plan_tasks_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.learning_plans(id)
);

CREATE TABLE public.resume_reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_role TEXT NOT NULL,
    resume_text TEXT,
    ats_score INTEGER NOT NULL,
    strengths TEXT NOT NULL,
    weaknesses TEXT NOT NULL,
    missing_keywords TEXT NOT NULL,
    bullet_rewrites TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT resume_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.interview_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_question_index INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.interview_answers (
    id TEXT PRIMARY KEY,
    interview_session_id TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    user_answer TEXT,
    score INTEGER,
    feedback TEXT,
    sample_answer TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_answers_interview_session_id_fkey
        FOREIGN KEY (interview_session_id) REFERENCES public.interview_sessions(id)
);

CREATE TABLE public.job_roles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    salary_range TEXT NOT NULL,
    skills TEXT NOT NULL,
    apply_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
