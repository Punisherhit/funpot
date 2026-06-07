
-- Helper functions
CREATE OR REPLACE FUNCTION public.is_coach_of_athlete(_user_id uuid, _athlete_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athletes a
    JOIN public.branch_coaches bc ON bc.branch_id = a.branch_id
    WHERE a.id = _athlete_id AND bc.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_coach_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'coach')
$$;

CREATE OR REPLACE FUNCTION public.is_coach_of_session(_user_id uuid, _session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.training_sessions s
    JOIN public.branch_coaches bc ON bc.branch_id = s.branch_id
    WHERE s.id = _session_id AND bc.user_id = _user_id
  )
$$;

-- Lock down SECURITY DEFINER function execution to authenticated only (no anon/public)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coach_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_athlete_number(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coach_of_athlete(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_is_coach_or_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coach_of_session(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_athlete_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_of_athlete(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_coach_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_of_session(uuid, uuid) TO authenticated;

-- PROFILES: restrict SELECT to self or admin
DROP POLICY IF EXISTS profiles_read_all_auth ON public.profiles;
CREATE POLICY profiles_self_or_admin_read ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.current_user_is_admin());

-- ATHLETES: restrict SELECT to admin or coach of branch
DROP POLICY IF EXISTS athletes_read_auth ON public.athletes;
CREATE POLICY athletes_read_scoped ON public.athletes FOR SELECT TO authenticated
USING (public.current_user_is_admin() OR public.is_coach_of(auth.uid(), branch_id));

-- ATHLETES coach update: enforce WITH CHECK so coach cannot reassign branch
DROP POLICY IF EXISTS athletes_coach_update ON public.athletes;
CREATE POLICY athletes_coach_update ON public.athletes FOR UPDATE TO authenticated
USING (public.is_coach_of(auth.uid(), branch_id))
WITH CHECK (public.is_coach_of(auth.uid(), branch_id));

-- ATTENDANCE: write restricted to coaches of session's branch (or admin)
DROP POLICY IF EXISTS attendance_write ON public.attendance;
CREATE POLICY attendance_write ON public.attendance FOR ALL TO authenticated
USING (public.current_user_is_admin() OR public.is_coach_of_session(auth.uid(), session_id))
WITH CHECK (public.current_user_is_admin() OR public.is_coach_of_session(auth.uid(), session_id));

-- AUDIT LOGS: insert must match auth.uid()
DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- BADGE AWARDS: insert restricted to admin/coach of athlete's branch
DROP POLICY IF EXISTS badge_awards_insert ON public.badge_awards;
CREATE POLICY badge_awards_insert ON public.badge_awards FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_admin() OR public.is_coach_of_athlete(auth.uid(), athlete_id));

-- COMPETITIONS: write restricted to admin/coach
DROP POLICY IF EXISTS competitions_write ON public.competitions;
CREATE POLICY competitions_write ON public.competitions FOR ALL TO authenticated
USING (public.current_user_is_coach_or_admin())
WITH CHECK (public.current_user_is_coach_or_admin());

-- COMPETITION RESULTS: write restricted to admin/coach of athlete's branch
DROP POLICY IF EXISTS comp_results_write ON public.competition_results;
CREATE POLICY comp_results_write ON public.competition_results FOR ALL TO authenticated
USING (public.current_user_is_admin() OR public.is_coach_of_athlete(auth.uid(), athlete_id))
WITH CHECK (public.current_user_is_admin() OR public.is_coach_of_athlete(auth.uid(), athlete_id));

-- MERCHANDISE SALES: insert restricted to admin/coach
DROP POLICY IF EXISTS merch_sales_insert ON public.merchandise_sales;
CREATE POLICY merch_sales_insert ON public.merchandise_sales FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_coach_or_admin());

-- PAYMENTS: insert restricted to admin/coach of athlete's branch
DROP POLICY IF EXISTS payments_insert ON public.payments;
CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_admin() OR public.is_coach_of_athlete(auth.uid(), athlete_id));

-- PAYMENTS: restrict SELECT to admin or coach of athlete's branch
DROP POLICY IF EXISTS payments_read ON public.payments;
CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated
USING (public.current_user_is_admin() OR public.is_coach_of_athlete(auth.uid(), athlete_id));

-- PROMOTIONS: insert restricted to admin/coach of athlete's branch and promoted_by = auth.uid()
DROP POLICY IF EXISTS promotions_insert ON public.promotions;
CREATE POLICY promotions_insert ON public.promotions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = promoted_by
  AND (public.current_user_is_admin() OR public.is_coach_of_athlete(auth.uid(), athlete_id))
);
