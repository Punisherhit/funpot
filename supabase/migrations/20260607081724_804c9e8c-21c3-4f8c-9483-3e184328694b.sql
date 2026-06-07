
-- Allow coaches to log athlete transfers for athletes currently in their branch
CREATE POLICY "transfers_coach_insert" ON public.athlete_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_coach_of(auth.uid(), from_branch_id)
    AND performed_by = auth.uid()
  );

-- Permit coaches to update athletes they coach, including moving them to another branch
DROP POLICY IF EXISTS "athletes_coach_update" ON public.athletes;
CREATE POLICY "athletes_coach_update" ON public.athletes
  FOR UPDATE TO authenticated
  USING (public.is_coach_of(auth.uid(), branch_id))
  WITH CHECK (true);
