# Manual Supabase Verification

Run these checks only against a disposable Supabase project, never a live production database. The SQL files are schema changes; review them before applying.

## SC-003 and SC-010: account deletion and isolation

1. In the Supabase SQL Editor for the disposable project, apply `supabase/04_hardening.sql`, then `supabase/05_rls_policies.sql`. Both scripts should complete without errors. Re-running either script should also complete without errors.

   **Expected:** user-owned data references `public.profiles(id)` with `ON DELETE CASCADE`; nested tasks and interview answers cascade from their parent; the interview-answer unique index, policies, and Auth profile trigger are present.

   **Result / date:** ______________________________________________

2. From the repository root, run `npx tsx scripts/verify-supabase.ts` with `DIRECT_URL` set to the disposable project's direct database URL.

   **Expected:** every printed `[SC-003]` and `[SC-013]` check is `PASS`, and the command exits with code 0. No credentials or connection URLs should be included in the output.

   **Result / date:** ______________________________________________

3. Create two throwaway Auth accounts, **User A** and **User B**, and sign into both through the app in separate browser sessions. Record their Auth user IDs. Using the app workflows, create as many User A records as practical in skill-gap reports, learning plans and plan tasks, resume reviews, interview sessions and answers, and AI usage. Create at least one corresponding record for User B.

   **Expected:** both users have profiles; User A has related records to delete; User B has data that must remain unchanged.

   **User A ID:** ____________________  **User B ID:** ____________________

   **Result / date:** ______________________________________________

4. While signed in as User A, delete the account through the app's existing account-deletion action (the authenticated `DELETE /api/my-data` route).

   **Expected:** the app reports success only after both application data and the Supabase Auth user have been deleted.

   **Result / date:** ______________________________________________

5. In the Supabase SQL Editor, substitute the recorded IDs into the query below.

   ```sql
   SELECT 'profiles' AS table_name, count(*) AS remaining
   FROM public.profiles WHERE id = '<USER_A_ID>'
   UNION ALL
   SELECT 'skill_gap_reports', count(*)
   FROM public.skill_gap_reports WHERE user_id = '<USER_A_ID>'
   UNION ALL
   SELECT 'learning_plans', count(*)
   FROM public.learning_plans WHERE user_id = '<USER_A_ID>'
   UNION ALL
   SELECT 'plan_tasks', count(*)
   FROM public.plan_tasks AS task
   JOIN public.learning_plans AS plan ON plan.id = task.plan_id
   WHERE plan.user_id = '<USER_A_ID>'
   UNION ALL
   SELECT 'resume_reviews', count(*)
   FROM public.resume_reviews WHERE user_id = '<USER_A_ID>'
   UNION ALL
   SELECT 'interview_sessions', count(*)
   FROM public.interview_sessions WHERE user_id = '<USER_A_ID>'
   UNION ALL
   SELECT 'interview_answers', count(*)
   FROM public.interview_answers AS answer
   JOIN public.interview_sessions AS session
     ON session.id = answer.interview_session_id
   WHERE session.user_id = '<USER_A_ID>'
   UNION ALL
   SELECT 'ai_usage', count(*)
   FROM public.ai_usage WHERE user_id = '<USER_A_ID>';

   SELECT count(*) AS auth_users_remaining
   FROM auth.users WHERE id = '<USER_A_ID>';
   ```

   **Expected:** every `remaining` value and `auth_users_remaining` are `0`. The `target_roles` and `job_roles` reference tables are global data and are not expected to be deleted.

   **Result / date:** ______________________________________________

6. Re-run the same user-scoped row-count checks for User B and check `auth.users` for User B's ID.

   **Expected:** User B's Auth record and all records created in step 3 remain unchanged.

   **Result / date:** ______________________________________________

7. After saving the SQL output and completing every result/date field above, paste the output from `npx tsx scripts/verify-supabase.ts` and the completed checklist back into the task. T076 must remain unchecked until those results are reviewed.

   **Result / date:** ______________________________________________
