BEGIN;

-- Defense in depth: Prisma connects as the table owner and does not rely on these policies.

DROP POLICY IF EXISTS skill_gap_reports_select_own ON public.skill_gap_reports;
CREATE POLICY skill_gap_reports_select_own
    ON public.skill_gap_reports FOR SELECT
    USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS skill_gap_reports_delete_own ON public.skill_gap_reports;
CREATE POLICY skill_gap_reports_delete_own
    ON public.skill_gap_reports FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS learning_plans_select_own ON public.learning_plans;
CREATE POLICY learning_plans_select_own
    ON public.learning_plans FOR SELECT
    USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS learning_plans_delete_own ON public.learning_plans;
CREATE POLICY learning_plans_delete_own
    ON public.learning_plans FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS resume_reviews_select_own ON public.resume_reviews;
CREATE POLICY resume_reviews_select_own
    ON public.resume_reviews FOR SELECT
    USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS resume_reviews_delete_own ON public.resume_reviews;
CREATE POLICY resume_reviews_delete_own
    ON public.resume_reviews FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS interview_sessions_select_own ON public.interview_sessions;
CREATE POLICY interview_sessions_select_own
    ON public.interview_sessions FOR SELECT
    USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS interview_sessions_delete_own ON public.interview_sessions;
CREATE POLICY interview_sessions_delete_own
    ON public.interview_sessions FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS plan_tasks_select_own ON public.plan_tasks;
CREATE POLICY plan_tasks_select_own
    ON public.plan_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.learning_plans AS owned_plan
            WHERE owned_plan.id = plan_tasks.plan_id
              AND owned_plan.user_id = (SELECT auth.uid())
        )
    );
DROP POLICY IF EXISTS plan_tasks_delete_own ON public.plan_tasks;
CREATE POLICY plan_tasks_delete_own
    ON public.plan_tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.learning_plans AS owned_plan
            WHERE owned_plan.id = plan_tasks.plan_id
              AND owned_plan.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS interview_answers_select_own ON public.interview_answers;
CREATE POLICY interview_answers_select_own
    ON public.interview_answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.interview_sessions AS owned_session
            WHERE owned_session.id = interview_answers.interview_session_id
              AND owned_session.user_id = (SELECT auth.uid())
        )
    );
DROP POLICY IF EXISTS interview_answers_delete_own ON public.interview_answers;
CREATE POLICY interview_answers_delete_own
    ON public.interview_answers FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.interview_sessions AS owned_session
            WHERE owned_session.id = interview_answers.interview_session_id
              AND owned_session.user_id = (SELECT auth.uid())
        )
    );

COMMIT;
