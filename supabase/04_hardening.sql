BEGIN;

INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data ->> 'full_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

DO $migration$
DECLARE
    table_name TEXT;
    orphan_count BIGINT;
    foreign_key RECORD;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'skill_gap_reports',
        'learning_plans',
        'resume_reviews',
        'interview_sessions'
    ]
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM public.%I AS child
             LEFT JOIN public.profiles AS profile ON profile.id = child.user_id
             WHERE profile.id IS NULL',
            table_name
        ) INTO orphan_count;

        IF orphan_count > 0 THEN
            RAISE EXCEPTION 'Cannot migrate %, found % orphaned user rows', table_name, orphan_count
                USING HINT = 'Repair or remove orphaned rows explicitly, then rerun this migration.';
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1
        FROM public.interview_answers
        GROUP BY interview_session_id, question_index
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot migrate: duplicate interview answers exist'
            USING HINT = 'Resolve duplicate (interview_session_id, question_index) rows explicitly; no answers were changed.';
    END IF;

    FOREACH table_name IN ARRAY ARRAY[
        'skill_gap_reports',
        'learning_plans',
        'resume_reviews',
        'interview_sessions'
    ]
    LOOP
        FOR foreign_key IN
            SELECT constraint_row.conname
            FROM pg_constraint AS constraint_row
            JOIN pg_attribute AS column_row
              ON column_row.attrelid = constraint_row.conrelid
             AND column_row.attname = 'user_id'
            WHERE constraint_row.conrelid = format('public.%I', table_name)::regclass
              AND constraint_row.contype = 'f'
              AND column_row.attnum = ANY (constraint_row.conkey)
        LOOP
            EXECUTE format(
                'ALTER TABLE public.%I DROP CONSTRAINT %I',
                table_name,
                foreign_key.conname
            );
        END LOOP;

        EXECUTE format(
            'ALTER TABLE public.%I
             ADD CONSTRAINT %I FOREIGN KEY (user_id)
             REFERENCES public.profiles(id) ON DELETE CASCADE',
            table_name,
            table_name || '_user_id_fkey'
        );
    END LOOP;
END;
$migration$;

CREATE TABLE IF NOT EXISTS public.ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_usage_user_id_created_at_idx
    ON public.ai_usage(user_id, created_at);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_usage FROM anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS interview_answers_session_question_key
    ON public.interview_answers(interview_session_id, question_index);
DROP INDEX IF EXISTS public.interview_answers_session_question_idx;

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
               GREATEST(
                   1,
                   CEIL(EXTRACT(EPOCH FROM (
                       oldest_usage + INTERVAL '60 minutes' - clock_timestamp()
                   )))::INTEGER
               );
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

COMMIT;
