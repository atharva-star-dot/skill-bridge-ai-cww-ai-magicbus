BEGIN;

DO $preflight$
DECLARE
    item RECORD;
    invalid_count BIGINT;
    column_data_type TEXT;
BEGIN
    IF to_regclass('auth.users') IS NULL THEN
        RAISE EXCEPTION 'Legacy upgrade aborted: auth.users does not exist';
    END IF;

    FOR item IN
        SELECT * FROM (VALUES
            ('profiles', 'id'),
            ('target_roles', 'id'),
            ('skill_gap_reports', 'id'),
            ('skill_gap_reports', 'user_id'),
            ('learning_plans', 'id'),
            ('learning_plans', 'user_id'),
            ('plan_tasks', 'id'),
            ('plan_tasks', 'plan_id'),
            ('resume_reviews', 'id'),
            ('resume_reviews', 'user_id'),
            ('interview_sessions', 'id'),
            ('interview_sessions', 'user_id'),
            ('interview_answers', 'id'),
            ('interview_answers', 'interview_session_id'),
            ('job_roles', 'id')
        ) AS uuid_columns(table_name, column_name)
    LOOP
        IF to_regclass(format('public.%I', item.table_name)) IS NULL THEN
            RAISE EXCEPTION 'Legacy upgrade aborted: required table public.% is missing', item.table_name;
        END IF;

        EXECUTE format(
            'SELECT count(*) FROM public.%I WHERE %I IS NULL OR %I::text !~* %L',
            item.table_name,
            item.column_name,
            item.column_name,
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ) INTO invalid_count;

        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Legacy upgrade aborted: public.%.% contains % null or invalid UUID values',
                item.table_name, item.column_name, invalid_count;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.id::uuid
        WHERE auth_user.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Legacy upgrade aborted: one or more profiles have no matching auth.users row';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.interview_answers
        GROUP BY interview_session_id, question_index
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Legacy upgrade aborted: duplicate (interview_session_id, question_index) rows exist';
    END IF;

    FOR item IN
        SELECT * FROM (VALUES
            ('profiles', 'created_at'),
            ('profiles', 'updated_at'),
            ('target_roles', 'created_at'),
            ('skill_gap_reports', 'created_at'),
            ('learning_plans', 'created_at'),
            ('resume_reviews', 'created_at'),
            ('interview_sessions', 'created_at'),
            ('interview_answers', 'created_at'),
            ('job_roles', 'created_at')
        ) AS timestamp_columns(table_name, column_name)
    LOOP
        BEGIN
            EXECUTE format(
                'SELECT count(*) FROM public.%I WHERE %I IS NULL OR %I::timestamptz IS NULL',
                item.table_name, item.column_name, item.column_name
            ) INTO invalid_count;
        EXCEPTION
            WHEN invalid_datetime_format OR datetime_field_overflow THEN
                RAISE EXCEPTION 'Legacy upgrade aborted: public.%.% contains unparsable timestamps',
                    item.table_name, item.column_name;
        END;
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Legacy upgrade aborted: public.%.% contains % null or unparsable timestamps',
                item.table_name, item.column_name, invalid_count;
        END IF;
    END LOOP;

    SELECT data_type INTO column_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plan_tasks'
      AND column_name = 'is_completed';
    IF column_data_type = 'integer' THEN
        IF EXISTS (
            SELECT 1 FROM public.plan_tasks
            WHERE is_completed IS NULL OR is_completed NOT IN (0, 1)
        ) THEN
            RAISE EXCEPTION 'Legacy upgrade aborted: plan_tasks.is_completed contains values other than 0 or 1';
        END IF;
    ELSIF column_data_type IS DISTINCT FROM 'boolean' THEN
        RAISE EXCEPTION 'Legacy upgrade aborted: plan_tasks.is_completed has unexpected type %',
            column_data_type;
    END IF;
    IF EXISTS (SELECT 1 FROM public.plan_tasks WHERE is_completed IS NULL) THEN
        RAISE EXCEPTION 'Legacy upgrade aborted: plan_tasks.is_completed contains null values';
    END IF;

    IF EXISTS (SELECT 1 FROM public.plan_tasks WHERE estimated_hours IS NULL) THEN
        RAISE EXCEPTION 'Legacy upgrade aborted: plan_tasks.estimated_hours contains null values';
    END IF;
    SELECT data_type INTO column_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plan_tasks'
      AND column_name = 'estimated_hours';
    IF column_data_type IS DISTINCT FROM 'real'
      AND column_data_type IS DISTINCT FROM 'double precision' THEN
        RAISE EXCEPTION 'Legacy upgrade aborted: plan_tasks.estimated_hours has unexpected type %',
            column_data_type;
    END IF;
END;
$preflight$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.skill_gap_reports DROP CONSTRAINT IF EXISTS skill_gap_reports_user_id_fkey;
ALTER TABLE public.learning_plans DROP CONSTRAINT IF EXISTS learning_plans_user_id_fkey;
ALTER TABLE public.plan_tasks DROP CONSTRAINT IF EXISTS plan_tasks_plan_id_fkey;
ALTER TABLE public.resume_reviews DROP CONSTRAINT IF EXISTS resume_reviews_user_id_fkey;
ALTER TABLE public.interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_user_id_fkey;
ALTER TABLE public.interview_answers DROP CONSTRAINT IF EXISTS interview_answers_interview_session_id_fkey;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS skill_gap_reports_select_own ON public.skill_gap_reports;
DROP POLICY IF EXISTS skill_gap_reports_delete_own ON public.skill_gap_reports;
DROP POLICY IF EXISTS learning_plans_select_own ON public.learning_plans;
DROP POLICY IF EXISTS learning_plans_delete_own ON public.learning_plans;
DROP POLICY IF EXISTS resume_reviews_select_own ON public.resume_reviews;
DROP POLICY IF EXISTS resume_reviews_delete_own ON public.resume_reviews;
DROP POLICY IF EXISTS interview_sessions_select_own ON public.interview_sessions;
DROP POLICY IF EXISTS interview_sessions_delete_own ON public.interview_sessions;
DROP POLICY IF EXISTS plan_tasks_select_own ON public.plan_tasks;
DROP POLICY IF EXISTS plan_tasks_delete_own ON public.plan_tasks;
DROP POLICY IF EXISTS interview_answers_select_own ON public.interview_answers;
DROP POLICY IF EXISTS interview_answers_delete_own ON public.interview_answers;

DO $convert$
DECLARE
    item RECORD;
    column_type TEXT;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
            ('profiles', 'id', TRUE),
            ('target_roles', 'id', TRUE),
            ('skill_gap_reports', 'id', TRUE),
            ('skill_gap_reports', 'user_id', FALSE),
            ('learning_plans', 'id', TRUE),
            ('learning_plans', 'user_id', FALSE),
            ('plan_tasks', 'id', TRUE),
            ('plan_tasks', 'plan_id', FALSE),
            ('resume_reviews', 'id', TRUE),
            ('resume_reviews', 'user_id', FALSE),
            ('interview_sessions', 'id', TRUE),
            ('interview_sessions', 'user_id', FALSE),
            ('interview_answers', 'id', TRUE),
            ('interview_answers', 'interview_session_id', FALSE),
            ('job_roles', 'id', TRUE)
        ) AS columns_to_convert(table_name, column_name, is_id)
    LOOP
        SELECT data_type INTO column_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = item.table_name
          AND column_name = item.column_name;

        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
            item.table_name, item.column_name);
        IF column_type = 'text' THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE uuid USING %I::uuid',
                item.table_name, item.column_name, item.column_name);
        ELSIF column_type IS DISTINCT FROM 'uuid' THEN
            RAISE EXCEPTION 'Legacy upgrade aborted: public.%.% has unexpected type %, expected text or uuid',
                item.table_name, item.column_name, column_type;
        END IF;

        IF item.is_id AND item.table_name <> 'profiles' THEN
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
                item.table_name
            );
        END IF;
    END LOOP;

    FOR item IN
        SELECT * FROM (VALUES
            ('profiles', 'created_at'),
            ('profiles', 'updated_at'),
            ('target_roles', 'created_at'),
            ('skill_gap_reports', 'created_at'),
            ('learning_plans', 'created_at'),
            ('resume_reviews', 'created_at'),
            ('interview_sessions', 'created_at'),
            ('interview_answers', 'created_at'),
            ('job_roles', 'created_at')
        ) AS timestamps_to_convert(table_name, column_name)
    LOOP
        SELECT data_type INTO column_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = item.table_name
          AND column_name = item.column_name;

        IF column_type = 'text' THEN
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz USING %I::timestamptz',
                item.table_name, item.column_name, item.column_name
            );
        ELSIF column_type IS DISTINCT FROM 'timestamp with time zone' THEN
            RAISE EXCEPTION 'Legacy upgrade aborted: public.%.% has unexpected type %, expected text or timestamptz',
                item.table_name, item.column_name, column_type;
        END IF;

        EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT CURRENT_TIMESTAMP',
            item.table_name, item.column_name
        );
        EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',
            item.table_name, item.column_name
        );
    END LOOP;
END;
$convert$;

DO $task_types$
DECLARE
    completion_type TEXT;
    hours_type TEXT;
BEGIN
    SELECT data_type INTO completion_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_tasks'
      AND column_name = 'is_completed';
    IF completion_type = 'integer' THEN
        ALTER TABLE public.plan_tasks ALTER COLUMN is_completed DROP DEFAULT;
        ALTER TABLE public.plan_tasks ALTER COLUMN is_completed TYPE boolean
            USING (is_completed <> 0);
    END IF;
    ALTER TABLE public.plan_tasks ALTER COLUMN is_completed SET DEFAULT false;
    ALTER TABLE public.plan_tasks ALTER COLUMN is_completed SET NOT NULL;

    SELECT data_type INTO hours_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_tasks'
      AND column_name = 'estimated_hours';
    IF hours_type = 'real' THEN
        ALTER TABLE public.plan_tasks ALTER COLUMN estimated_hours TYPE double precision
            USING (estimated_hours::numeric::double precision);
    END IF;
    ALTER TABLE public.plan_tasks ALTER COLUMN estimated_hours SET NOT NULL;
END;
$task_types$;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.skill_gap_reports
    ADD CONSTRAINT skill_gap_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.learning_plans
    ADD CONSTRAINT learning_plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.plan_tasks
    ADD CONSTRAINT plan_tasks_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES public.learning_plans(id) ON DELETE CASCADE;
ALTER TABLE public.resume_reviews
    ADD CONSTRAINT resume_reviews_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.interview_sessions
    ADD CONSTRAINT interview_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.interview_answers
    ADD CONSTRAINT interview_answers_interview_session_id_fkey
    FOREIGN KEY (interview_session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS target_roles_slug_key ON public.target_roles(slug);
CREATE INDEX IF NOT EXISTS skill_gap_reports_user_id_idx ON public.skill_gap_reports(user_id);
CREATE INDEX IF NOT EXISTS skill_gap_reports_user_id_target_role_idx
    ON public.skill_gap_reports(user_id, target_role);
CREATE INDEX IF NOT EXISTS learning_plans_user_id_idx ON public.learning_plans(user_id);
CREATE INDEX IF NOT EXISTS learning_plans_user_id_target_role_idx
    ON public.learning_plans(user_id, target_role);
CREATE INDEX IF NOT EXISTS plan_tasks_plan_id_week_number_idx
    ON public.plan_tasks(plan_id, week_number);
CREATE INDEX IF NOT EXISTS resume_reviews_user_id_idx ON public.resume_reviews(user_id);
CREATE INDEX IF NOT EXISTS resume_reviews_user_id_target_role_idx
    ON public.resume_reviews(user_id, target_role);
CREATE INDEX IF NOT EXISTS interview_sessions_user_id_idx ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS interview_sessions_user_id_target_role_idx
    ON public.interview_sessions(user_id, target_role);
CREATE UNIQUE INDEX IF NOT EXISTS interview_answers_session_question_key
    ON public.interview_answers(interview_session_id, question_index);
DROP INDEX IF EXISTS public.interview_answers_session_question_idx;

CREATE TABLE IF NOT EXISTS public.ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_usage_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ai_usage_user_id_created_at_idx
    ON public.ai_usage(user_id, created_at);

DO $rls$
DECLARE
    table_row RECORD;
BEGIN
    FOR table_row IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_row.tablename);
    END LOOP;
END;
$rls$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$function$;

DO $trigger$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END;
$trigger$;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    window_start TIMESTAMPTZ;
    usage_count INTEGER;
    oldest_usage TIMESTAMPTZ;
BEGIN
    IF p_user_id IS NULL OR p_limit < 1 THEN
        RAISE EXCEPTION 'A user ID and positive quota limit are required';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));
    window_start := clock_timestamp() - INTERVAL '60 minutes';
    DELETE FROM public.ai_usage
    WHERE user_id = p_user_id AND created_at < window_start;

    SELECT count(*)::INTEGER, min(created_at)
      INTO usage_count, oldest_usage
      FROM public.ai_usage
     WHERE user_id = p_user_id AND created_at >= window_start;

    IF usage_count >= p_limit THEN
        RETURN QUERY
        SELECT FALSE,
               GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
                   oldest_usage + INTERVAL '60 minutes' - clock_timestamp()
               )))::INTEGER);
        RETURN;
    END IF;

    INSERT INTO public.ai_usage (user_id, created_at)
    VALUES (p_user_id, clock_timestamp());
    RETURN QUERY SELECT TRUE, 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_start_interview(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    active_count INTEGER;
BEGIN
    IF p_user_id IS NULL OR p_limit < 1 THEN
        RAISE EXCEPTION 'A user ID and positive interview limit are required';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));
    SELECT count(*)::INTEGER
      INTO active_count
      FROM public.interview_sessions
     WHERE user_id = p_user_id AND status = 'in_progress';
    RETURN active_count < p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_ai_usage(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_start_interview(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_start_interview(UUID, INTEGER) TO service_role;

DO $policies$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
        CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
        CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skill_gap_reports' AND policyname = 'skill_gap_reports_select_own') THEN
        CREATE POLICY skill_gap_reports_select_own ON public.skill_gap_reports FOR SELECT USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skill_gap_reports' AND policyname = 'skill_gap_reports_delete_own') THEN
        CREATE POLICY skill_gap_reports_delete_own ON public.skill_gap_reports FOR DELETE USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'learning_plans' AND policyname = 'learning_plans_select_own') THEN
        CREATE POLICY learning_plans_select_own ON public.learning_plans FOR SELECT USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'learning_plans' AND policyname = 'learning_plans_delete_own') THEN
        CREATE POLICY learning_plans_delete_own ON public.learning_plans FOR DELETE USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'resume_reviews' AND policyname = 'resume_reviews_select_own') THEN
        CREATE POLICY resume_reviews_select_own ON public.resume_reviews FOR SELECT USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'resume_reviews' AND policyname = 'resume_reviews_delete_own') THEN
        CREATE POLICY resume_reviews_delete_own ON public.resume_reviews FOR DELETE USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_sessions' AND policyname = 'interview_sessions_select_own') THEN
        CREATE POLICY interview_sessions_select_own ON public.interview_sessions FOR SELECT USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_sessions' AND policyname = 'interview_sessions_delete_own') THEN
        CREATE POLICY interview_sessions_delete_own ON public.interview_sessions FOR DELETE USING ((SELECT auth.uid()) = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plan_tasks' AND policyname = 'plan_tasks_select_own') THEN
        CREATE POLICY plan_tasks_select_own ON public.plan_tasks FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.learning_plans AS owned_plan
                    WHERE owned_plan.id = plan_tasks.plan_id
                      AND owned_plan.user_id = (SELECT auth.uid()))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plan_tasks' AND policyname = 'plan_tasks_delete_own') THEN
        CREATE POLICY plan_tasks_delete_own ON public.plan_tasks FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.learning_plans AS owned_plan
                    WHERE owned_plan.id = plan_tasks.plan_id
                      AND owned_plan.user_id = (SELECT auth.uid()))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_answers' AND policyname = 'interview_answers_select_own') THEN
        CREATE POLICY interview_answers_select_own ON public.interview_answers FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.interview_sessions AS owned_session
                    WHERE owned_session.id = interview_answers.interview_session_id
                      AND owned_session.user_id = (SELECT auth.uid()))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interview_answers' AND policyname = 'interview_answers_delete_own') THEN
        CREATE POLICY interview_answers_delete_own ON public.interview_answers FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.interview_sessions AS owned_session
                    WHERE owned_session.id = interview_answers.interview_session_id
                      AND owned_session.user_id = (SELECT auth.uid()))
        );
    END IF;
END;
$policies$;

COMMIT;
