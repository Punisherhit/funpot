
-- Fee invoices
CREATE TABLE public.fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL DEFAULT 'monthly' CHECK (kind IN ('monthly','competition','event','other')),
  description TEXT,
  period_month DATE,
  due_date DATE NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL CHECK (amount_due >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue','cancelled')),
  reminder_last_sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX fee_invoices_branch_idx ON public.fee_invoices(branch_id);
CREATE INDEX fee_invoices_athlete_idx ON public.fee_invoices(athlete_id);
CREATE INDEX fee_invoices_status_idx ON public.fee_invoices(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_invoices TO authenticated;
GRANT ALL ON public.fee_invoices TO service_role;

ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_invoices_read" ON public.fee_invoices FOR SELECT TO authenticated
USING (public.current_user_is_admin() OR public.is_coach_of(auth.uid(), branch_id));

CREATE POLICY "fee_invoices_insert" ON public.fee_invoices FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_admin() OR public.is_coach_of(auth.uid(), branch_id));

CREATE POLICY "fee_invoices_update" ON public.fee_invoices FOR UPDATE TO authenticated
USING (public.current_user_is_admin() OR public.is_coach_of(auth.uid(), branch_id))
WITH CHECK (public.current_user_is_admin() OR public.is_coach_of(auth.uid(), branch_id));

CREATE POLICY "fee_invoices_delete" ON public.fee_invoices FOR DELETE TO authenticated
USING (public.current_user_is_admin());

CREATE TRIGGER fee_invoices_updated_at BEFORE UPDATE ON public.fee_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reminder logs
CREATE TABLE public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
  parent_email TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms')),
  trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual','auto')),
  total_outstanding NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  error TEXT,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reminder_logs_branch_idx ON public.reminder_logs(branch_id);
CREATE INDEX reminder_logs_created_idx ON public.reminder_logs(created_at DESC);

GRANT SELECT, INSERT ON public.reminder_logs TO authenticated;
GRANT ALL ON public.reminder_logs TO service_role;

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminder_logs_read" ON public.reminder_logs FOR SELECT TO authenticated
USING (public.current_user_is_admin() OR public.is_coach_of(auth.uid(), branch_id));

CREATE POLICY "reminder_logs_insert" ON public.reminder_logs FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_admin() OR public.is_coach_of(auth.uid(), branch_id));
