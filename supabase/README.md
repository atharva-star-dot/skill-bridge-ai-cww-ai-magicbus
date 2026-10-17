# 🗄️ Supabase Database Setup & Migration Guide

This directory contains idempotent SQL files for initializing and configuring the Supabase PostgreSQL database for **Skill Bridge AI**.

---

## 📋 File Overview & Run Order

Run these scripts in the **Supabase Dashboard → SQL Editor** in the following order:

| File | Purpose | Notes |
|---|---|---|
| `00_RUN_ALL.sql` | **All-in-one execution** | Concatenation of `01`, `02`, and `03` in exact order. Safe to run in one click. |
| `01_schema.sql` | Core schema DDL | Creates tables, indexes, and cascading foreign keys referencing `auth.users(id)`. |
| `02_auth_and_security.sql` | Auth triggers & RLS | Creates `profiles` table, auto-creates profile on auth signup, enables RLS, grants access. |
| `03_seed.sql` | Curated production data | Inserts 25 entry-level roles and 40 verified Indian tech jobs (`ON CONFLICT DO NOTHING`). |

> **Recommended**: Open `00_RUN_ALL.sql`, paste into the Supabase SQL Editor, and click **Run**.

---

## 🔍 Verification Query

After executing the SQL scripts, run this verification query in the SQL Editor to ensure all tables exist and data is populated:

```sql
-- 1. Verify all public tables exist
SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Count seeded roles and jobs
SELECT
    (SELECT COUNT(*) FROM public.target_roles) AS total_target_roles,  -- Expected: 25
    (SELECT COUNT(*) FROM public.job_roles) AS total_job_roles;        -- Expected: 40

-- 3. Verify Row Level Security is active
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🔄 How to Reset the Database

If you need to wipe and reset all application data:

```sql
-- DANGER: Drops all application tables and data. Does NOT delete auth.users.
DROP TABLE IF EXISTS public.interview_answers CASCADE;
DROP TABLE IF EXISTS public.interview_sessions CASCADE;
DROP TABLE IF EXISTS public.plan_tasks CASCADE;
DROP TABLE IF EXISTS public.learning_plans CASCADE;
DROP TABLE IF EXISTS public.resume_reviews CASCADE;
DROP TABLE IF EXISTS public.skill_gap_reports CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.target_roles CASCADE;
DROP TABLE IF EXISTS public.job_roles CASCADE;

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- After running the reset above, simply re-run 00_RUN_ALL.sql
```
