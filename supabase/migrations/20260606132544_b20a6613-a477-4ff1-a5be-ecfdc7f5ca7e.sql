
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','coach');
CREATE TYPE public.gender_t AS ENUM ('male','female','other');
CREATE TYPE public.discipline_t AS ENUM ('speed','artistic','recreational','inline_hockey','other');
CREATE TYPE public.level_t AS ENUM ('beginner','intermediate','advanced','elite');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused');
CREATE TYPE public.payment_type_t AS ENUM ('registration','monthly','competition','merchandise');
CREATE TYPE public.payment_method_t AS ENUM ('mpesa','cash');

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'super_admin')
$$;

-- Allow admins to read all roles too
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles(id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS(SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'coach') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ BRANCHES ============
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_read_auth" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_admin_write" ON public.branches FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coach <-> Branch assignment
CREATE TABLE public.branch_coaches (
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_coaches TO authenticated;
GRANT ALL ON public.branch_coaches TO service_role;
ALTER TABLE public.branch_coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branch_coaches_read" ON public.branch_coaches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branch_coaches_admin" ON public.branch_coaches FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.is_coach_of(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.branch_coaches WHERE user_id=_user_id AND branch_id=_branch_id)
$$;

-- ============ ATHLETES ============
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender public.gender_t,
  nationality TEXT,
  id_passport TEXT,
  school TEXT,
  class_level TEXT,
  address TEXT,
  town TEXT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  photo_url TEXT,
  medical_info TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  preferred_foot TEXT,
  years_experience INTEGER DEFAULT 0,
  discipline public.discipline_t NOT NULL DEFAULT 'recreational',
  current_level public.level_t NOT NULL DEFAULT 'beginner',
  active BOOLEAN NOT NULL DEFAULT true,
  registered_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX athletes_branch_idx ON public.athletes(branch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athletes TO authenticated;
GRANT ALL ON public.athletes TO service_role;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athletes_read_auth" ON public.athletes FOR SELECT TO authenticated USING (true);
CREATE POLICY "athletes_admin_all" ON public.athletes FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "athletes_coach_insert" ON public.athletes FOR INSERT TO authenticated
  WITH CHECK (public.is_coach_of(auth.uid(), branch_id));
CREATE POLICY "athletes_coach_update" ON public.athletes FOR UPDATE TO authenticated
  USING (public.is_coach_of(auth.uid(), branch_id));
CREATE TRIGGER trg_athletes_updated BEFORE UPDATE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Athlete number generator
CREATE OR REPLACE FUNCTION public.next_athlete_number(_branch_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT; v_year INT; v_seq INT; v_num TEXT;
BEGIN
  SELECT code INTO v_code FROM public.branches WHERE id = _branch_id;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Branch not found'; END IF;
  v_year := EXTRACT(YEAR FROM now())::INT;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(athlete_number, '^[A-Z]+-\d{4}-', ''), '')::INT), 0) + 1
    INTO v_seq
  FROM public.athletes
  WHERE branch_id = _branch_id AND registered_year = v_year;
  v_num := v_code || '-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN v_num;
END;
$$;

-- ============ ATHLETE TRANSFERS ============
CREATE TABLE public.athlete_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  from_branch_id UUID REFERENCES public.branches(id),
  to_branch_id UUID NOT NULL REFERENCES public.branches(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.athlete_transfers TO authenticated;
GRANT ALL ON public.athlete_transfers TO service_role;
ALTER TABLE public.athlete_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_read" ON public.athlete_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "transfers_admin_insert" ON public.athlete_transfers FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());

-- ============ TRAINING SESSIONS + ATTENDANCE ============
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  title TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX training_sessions_branch_date_idx ON public.training_sessions(branch_id, session_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_read" ON public.training_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_admin_all" ON public.training_sessions FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "sessions_coach_write" ON public.training_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_coach_of(auth.uid(), branch_id));
CREATE POLICY "sessions_coach_update" ON public.training_sessions FOR UPDATE TO authenticated
  USING (public.is_coach_of(auth.uid(), branch_id));

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES auth.users(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_read" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_write" ON public.attendance FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============ ASSESSMENTS ============
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  assessor_id UUID NOT NULL REFERENCES auth.users(id),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quarter TEXT,
  -- Core Skills
  balance_stability INTEGER CHECK (balance_stability BETWEEN 0 AND 100),
  speed_control INTEGER CHECK (speed_control BETWEEN 0 AND 100),
  turning_technique INTEGER CHECK (turning_technique BETWEEN 0 AND 100),
  endurance INTEGER CHECK (endurance BETWEEN 0 AND 100),
  agility INTEGER CHECK (agility BETWEEN 0 AND 100),
  race_skills INTEGER CHECK (race_skills BETWEEN 0 AND 100),
  -- Discipline & Attitude
  punctuality INTEGER CHECK (punctuality BETWEEN 0 AND 100),
  consistency INTEGER CHECK (consistency BETWEEN 0 AND 100),
  coachability INTEGER CHECK (coachability BETWEEN 0 AND 100),
  team_spirit INTEGER CHECK (team_spirit BETWEEN 0 AND 100),
  respect INTEGER CHECK (respect BETWEEN 0 AND 100),
  -- Fitness
  strength INTEGER CHECK (strength BETWEEN 0 AND 100),
  flexibility INTEGER CHECK (flexibility BETWEEN 0 AND 100),
  stamina INTEGER CHECK (stamina BETWEEN 0 AND 100),
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments_read" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessments_insert" ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = assessor_id);
CREATE POLICY "assessments_admin_update" ON public.assessments FOR UPDATE TO authenticated
  USING (public.current_user_is_admin());

-- ============ PROMOTIONS ============
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  previous_level public.level_t,
  new_level public.level_t NOT NULL,
  promoted_by UUID NOT NULL REFERENCES auth.users(id),
  promotion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_read" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "promotions_insert" ON public.promotions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = promoted_by);

-- ============ COMPETITIONS ============
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  competition_date DATE NOT NULL,
  location TEXT,
  branch_id UUID REFERENCES public.branches(id),
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitions_read" ON public.competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "competitions_write" ON public.competitions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE public.competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  position INTEGER,
  timing TEXT,
  medal TEXT,
  score NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competition_id, athlete_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_results TO authenticated;
GRANT ALL ON public.competition_results TO service_role;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_results_read" ON public.competition_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "comp_results_write" ON public.competition_results FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_type public.payment_type_t NOT NULL,
  payment_method public.payment_method_t NOT NULL,
  reference TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_athlete_idx ON public.payments(athlete_id);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_read" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payments_admin_update" ON public.payments FOR UPDATE TO authenticated
  USING (public.current_user_is_admin());

-- ============ MERCHANDISE ============
CREATE TABLE public.merchandise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchandise TO authenticated;
GRANT ALL ON public.merchandise TO service_role;
ALTER TABLE public.merchandise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merch_read" ON public.merchandise FOR SELECT TO authenticated USING (true);
CREATE POLICY "merch_admin_write" ON public.merchandise FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_merch_updated BEFORE UPDATE ON public.merchandise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.merchandise_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchandise_id UUID NOT NULL REFERENCES public.merchandise(id) ON DELETE RESTRICT,
  athlete_id UUID REFERENCES public.athletes(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  payment_id UUID REFERENCES public.payments(id),
  sold_by UUID REFERENCES auth.users(id),
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.merchandise_sales TO authenticated;
GRANT ALL ON public.merchandise_sales TO service_role;
ALTER TABLE public.merchandise_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merch_sales_read" ON public.merchandise_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "merch_sales_insert" ON public.merchandise_sales FOR INSERT TO authenticated WITH CHECK (true);

-- ============ BADGES ============
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_read" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges_admin" ON public.badges FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TABLE public.badge_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id),
  awarded_by UUID REFERENCES auth.users(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.badge_awards TO authenticated;
GRANT ALL ON public.badge_awards TO service_role;
ALTER TABLE public.badge_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badge_awards_read" ON public.badge_awards FOR SELECT TO authenticated USING (true);
CREATE POLICY "badge_awards_insert" ON public.badge_awards FOR INSERT TO authenticated WITH CHECK (true);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.current_user_is_admin());
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============ SEED BRANCHES ============
INSERT INTO public.branches (name, code, location) VALUES
  ('Malindi','MLD','Malindi'),
  ('Watamu','WTM','Watamu'),
  ('Kilifi','KLF','Kilifi')
ON CONFLICT (code) DO NOTHING;

-- Seed initial badges
INSERT INTO public.badges (name, description, icon) VALUES
  ('Speed Star','Outstanding speed performance','zap'),
  ('Balance Master','Exceptional balance & stability','scale'),
  ('Team Player','Excellent team spirit','users'),
  ('Endurance Champion','Sustained endurance','flame')
ON CONFLICT (name) DO NOTHING;
