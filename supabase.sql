-- ============================================
-- NAMALÌ SHIFT APP - SUPABASE SETUP v5
-- Eseguire su un progetto Supabase nuovo.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rimuove l'eventuale trigger insicuro delle versioni precedenti.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Rome',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  position TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  clock_in_station_id UUID REFERENCES public.stations(id) ON DELETE RESTRICT,
  clock_out_station_id UUID REFERENCES public.stations(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'active' AND clock_out IS NULL)
    OR (status = 'completed' AND clock_out IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_shift_per_employee
ON public.shifts(employee_id)
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.clock_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.stations(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('clock_in', 'clock_out', 'rejected')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shifts_updated_at ON public.shifts;
CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.clock_in_out(p_station_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_station_id UUID;
  v_employee_role TEXT;
  v_employee_active BOOLEAN;
  v_station_active BOOLEAN;
  v_open_shift public.shifts%ROWTYPE;
  v_last_event public.clock_events%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_lock_id BIGINT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non autenticato');
  END IF;

  v_lock_id := hashtextextended(v_user_id::TEXT, 0);
  PERFORM pg_advisory_xact_lock(v_lock_id);

  SELECT company_id, role, active
  INTO v_company_id, v_employee_role, v_employee_active
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    INSERT INTO public.clock_events (
      company_id, employee_id, auth_user_id, station_id,
      event_type, occurred_at, result
    ) VALUES (
      NULL, NULL, v_user_id, NULL,
      'rejected', v_now, 'Profilo non trovato'
    );
    RETURN jsonb_build_object('success', false, 'message', 'Profilo non trovato');
  END IF;

  IF v_employee_role <> 'employee' THEN
    INSERT INTO public.clock_events (
      company_id, employee_id, auth_user_id, station_id,
      event_type, occurred_at, result
    ) VALUES (
      v_company_id, v_user_id, v_user_id, NULL,
      'rejected', v_now, 'Solo i dipendenti possono timbrare'
    );
    RETURN jsonb_build_object('success', false, 'message', 'Solo i dipendenti possono timbrare');
  END IF;

  IF v_employee_active IS DISTINCT FROM TRUE THEN
    INSERT INTO public.clock_events (
      company_id, employee_id, auth_user_id, station_id,
      event_type, occurred_at, result
    ) VALUES (
      v_company_id, v_user_id, v_user_id, NULL,
      'rejected', v_now, 'Utente disattivato'
    );
    RETURN jsonb_build_object('success', false, 'message', 'Utente disattivato');
  END IF;

  SELECT id, active
  INTO v_station_id, v_station_active
  FROM public.stations
  WHERE company_id = v_company_id
    AND code = TRIM(p_station_code)
  LIMIT 1;

  IF v_station_id IS NULL THEN
    INSERT INTO public.clock_events (
      company_id, employee_id, auth_user_id, station_id,
      event_type, occurred_at, result
    ) VALUES (
      v_company_id, v_user_id, v_user_id, NULL,
      'rejected', v_now, 'Postazione non trovata'
    );
    RETURN jsonb_build_object('success', false, 'message', 'Postazione non trovata');
  END IF;

  IF v_station_active IS DISTINCT FROM TRUE THEN
    INSERT INTO public.clock_events (
      company_id, employee_id, auth_user_id, station_id,
      event_type, occurred_at, result
    ) VALUES (
      v_company_id, v_user_id, v_user_id, v_station_id,
      'rejected', v_now, 'Postazione disattivata'
    );
    RETURN jsonb_build_object('success', false, 'message', 'Postazione disattivata');
  END IF;

  SELECT *
  INTO v_last_event
  FROM public.clock_events
  WHERE employee_id = v_user_id
    AND event_type IN ('clock_in', 'clock_out')
  ORDER BY occurred_at DESC
  LIMIT 1;

  IF v_last_event.occurred_at IS NOT NULL
     AND EXTRACT(EPOCH FROM (v_now - v_last_event.occurred_at)) < 30 THEN
    INSERT INTO public.clock_events (
      company_id, employee_id, auth_user_id, station_id,
      event_type, occurred_at, result
    ) VALUES (
      v_company_id, v_user_id, v_user_id, v_station_id,
      'rejected', v_now, 'Doppia scansione entro 30 secondi'
    );
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendi 30 secondi prima di timbrare di nuovo'
    );
  END IF;

  SELECT *
  INTO v_open_shift
  FROM public.shifts
  WHERE employee_id = v_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_open_shift.id IS NULL THEN
    BEGIN
      INSERT INTO public.shifts (
        company_id, employee_id, clock_in, status, clock_in_station_id
      ) VALUES (
        v_company_id, v_user_id, v_now, 'active', v_station_id
      );

      INSERT INTO public.clock_events (
        company_id, employee_id, auth_user_id, station_id,
        event_type, occurred_at, result
      ) VALUES (
        v_company_id, v_user_id, v_user_id, v_station_id,
        'clock_in', v_now, 'success'
      );

      RETURN jsonb_build_object(
        'success', true,
        'message', 'Entrata registrata alle ' || TO_CHAR(v_now AT TIME ZONE 'Europe/Rome', 'HH24:MI'),
        'type', 'clock_in'
      );
    EXCEPTION WHEN unique_violation THEN
      INSERT INTO public.clock_events (
        company_id, employee_id, auth_user_id, station_id,
        event_type, occurred_at, result
      ) VALUES (
        v_company_id, v_user_id, v_user_id, v_station_id,
        'rejected', v_now, 'Conflitto turno attivo'
      );
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Conflitto: turno già aperto. Riprova.'
      );
    END;
  END IF;

  UPDATE public.shifts
  SET clock_out = v_now,
      status = 'completed',
      clock_out_station_id = v_station_id,
      updated_at = v_now
  WHERE id = v_open_shift.id;

  INSERT INTO public.clock_events (
    company_id, employee_id, auth_user_id, station_id,
    event_type, occurred_at, result
  ) VALUES (
    v_company_id, v_user_id, v_user_id, v_station_id,
    'clock_out', v_now, 'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Uscita registrata alle ' || TO_CHAR(v_now AT TIME ZONE 'Europe/Rome', 'HH24:MI'),
    'type', 'clock_out'
  );
END;
$$;

-- Permessi funzioni
REVOKE ALL ON FUNCTION public.get_my_company_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clock_in_out(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clock_in_out(TEXT) TO authenticated;

-- Permessi tabelle: il client legge; scrive turni/eventi solo tramite RPC.
REVOKE ALL ON public.companies, public.profiles, public.stations, public.shifts, public.clock_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.companies, public.profiles, public.stations, public.shifts, public.clock_events FROM authenticated;
GRANT SELECT ON public.companies, public.profiles, public.stations, public.shifts, public.clock_events TO authenticated;
GRANT UPDATE (read) ON public.clock_events TO authenticated;

-- Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_select ON public.companies;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS stations_select ON public.stations;
DROP POLICY IF EXISTS shifts_select ON public.shifts;
DROP POLICY IF EXISTS shifts_insert ON public.shifts;
DROP POLICY IF EXISTS shifts_update ON public.shifts;
DROP POLICY IF EXISTS events_select ON public.clock_events;
DROP POLICY IF EXISTS events_insert ON public.clock_events;
DROP POLICY IF EXISTS events_update ON public.clock_events;

CREATE POLICY companies_select ON public.companies
FOR SELECT
USING (id = public.get_my_company_id());

CREATE POLICY profiles_select ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
);

CREATE POLICY stations_select ON public.stations
FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY shifts_select ON public.shifts
FOR SELECT
USING (
  employee_id = auth.uid()
  OR (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
);

CREATE POLICY events_select ON public.clock_events
FOR SELECT
USING (
  employee_id = auth.uid()
  OR (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
);

CREATE POLICY events_update ON public.clock_events
FOR UPDATE
USING (
  public.get_my_role() = 'admin'
  AND company_id = public.get_my_company_id()
)
WITH CHECK (
  public.get_my_role() = 'admin'
  AND company_id = public.get_my_company_id()
);

-- Seed azienda e postazione
INSERT INTO public.companies (id, name, timezone)
VALUES ('11111111-1111-1111-1111-111111111111', 'Namalì', 'Europe/Rome')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    timezone = EXCLUDED.timezone;

INSERT INTO public.stations (id, company_id, code, name, active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'NAMALI-001',
  'Ingresso Namalì',
  TRUE
)
ON CONFLICT (company_id, code) DO UPDATE
SET name = EXCLUDED.name,
    active = EXCLUDED.active;

-- Gli utenti Auth NON vengono creati da questo script.
-- Creali dal Dashboard Supabase e poi inserisci i profili seguendo README.md.
