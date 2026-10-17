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
