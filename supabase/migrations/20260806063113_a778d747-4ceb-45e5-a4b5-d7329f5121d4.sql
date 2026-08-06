-- 1. role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

COMMIT;

-- 2. client profiles
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  client_type text NOT NULL DEFAULT 'other',
  display_name text,
  partner_name text,
  city text,
  contact_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles TO authenticated;
GRANT ALL ON public.client_profiles TO service_role;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client profiles"
ON public.client_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Clients view own profile"
ON public.client_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. client events (memorable dates)
CREATE TABLE IF NOT EXISTS public.client_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'wedding',
  event_date date NOT NULL,
  title text,
  notes text,
  greeting_enabled boolean NOT NULL DEFAULT true,
  prep_days integer NOT NULL DEFAULT 7,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_events_user ON public.client_events(client_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_events TO authenticated;
GRANT ALL ON public.client_events TO service_role;
ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client events"
ON public.client_events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Clients view own events"
ON public.client_events FOR SELECT TO authenticated
USING (client_user_id = auth.uid());

-- 4. greeting log
CREATE TABLE IF NOT EXISTS public.client_greeting_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id uuid NOT NULL REFERENCES public.client_events(id) ON DELETE CASCADE,
  notify_year integer NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_event_id, notify_year, kind)
);

GRANT SELECT ON public.client_greeting_log TO authenticated;
GRANT ALL ON public.client_greeting_log TO service_role;
ALTER TABLE public.client_greeting_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view greeting log"
ON public.client_greeting_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

-- 5. updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_client_profiles_touch ON public.client_profiles;
CREATE TRIGGER trg_client_profiles_touch BEFORE UPDATE ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_client_events_touch ON public.client_events;
CREATE TRIGGER trg_client_events_touch BEFORE UPDATE ON public.client_events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. upcoming greetings for admin panel
CREATE OR REPLACE FUNCTION public.get_upcoming_client_greetings(_days integer DEFAULT 60)
RETURNS TABLE(
  event_id uuid,
  client_user_id uuid,
  client_name text,
  avatar_url text,
  client_type text,
  event_type text,
  event_date date,
  title text,
  notes text,
  prep_days integer,
  greeting_enabled boolean,
  next_date date,
  days_left integer,
  years_count integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Europe/Kyiv')::date;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.client_user_id,
    COALESCE(NULLIF(TRIM(cp.display_name), ''), NULLIF(TRIM(u.full_name), ''), 'Клієнт'),
    u.avatar_url,
    COALESCE(cp.client_type, 'other'),
    e.event_type,
    e.event_date,
    e.title,
    e.notes,
    e.prep_days,
    e.greeting_enabled,
    nd.next_date,
    (nd.next_date - _today)::int,
    (EXTRACT(YEAR FROM nd.next_date) - EXTRACT(YEAR FROM e.event_date))::int
  FROM public.client_events e
  LEFT JOIN public.users u ON u.id = e.client_user_id
  LEFT JOIN public.client_profiles cp ON cp.user_id = e.client_user_id
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN make_date(EXTRACT(YEAR FROM _today)::int, EXTRACT(MONTH FROM e.event_date)::int, LEAST(EXTRACT(DAY FROM e.event_date)::int, 28)) >= _today
        THEN make_date(EXTRACT(YEAR FROM _today)::int, EXTRACT(MONTH FROM e.event_date)::int, EXTRACT(DAY FROM e.event_date)::int)
      ELSE make_date(EXTRACT(YEAR FROM _today)::int + 1, EXTRACT(MONTH FROM e.event_date)::int, EXTRACT(DAY FROM e.event_date)::int)
    END AS next_date
  ) nd
  WHERE (nd.next_date - _today) <= _days
  ORDER BY nd.next_date ASC;
END;
$$;

-- 7. daily job function
CREATE OR REPLACE FUNCTION public.notify_client_anniversaries()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Europe/Kyiv')::date;
  _year integer := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/Kyiv'))::int;
  _rec record;
  _admin record;
  _greetings integer := 0;
  _preps integer := 0;
  _label text;
  _years integer;
BEGIN
  -- greetings to clients on the day
  FOR _rec IN
    SELECT e.*, COALESCE(NULLIF(TRIM(cp.display_name), ''), NULLIF(TRIM(u.full_name), ''), 'Клієнт') AS client_name
    FROM public.client_events e
    JOIN public.users u ON u.id = e.client_user_id
    LEFT JOIN public.client_profiles cp ON cp.user_id = e.client_user_id
    WHERE e.greeting_enabled
      AND COALESCE(u.is_blocked, false) = false
      AND EXTRACT(MONTH FROM e.event_date) = EXTRACT(MONTH FROM _today)
      AND EXTRACT(DAY FROM e.event_date) = EXTRACT(DAY FROM _today)
      AND EXTRACT(YEAR FROM e.event_date) < _year
      AND NOT EXISTS (
        SELECT 1 FROM public.client_greeting_log l
        WHERE l.client_event_id = e.id AND l.notify_year = _year AND l.kind = 'client'
      )
  LOOP
    _years := _year - EXTRACT(YEAR FROM _rec.event_date)::int;
    _label := COALESCE(NULLIF(TRIM(_rec.title), ''),
      CASE _rec.event_type
        WHEN 'wedding' THEN 'річницею весілля'
        WHEN 'christening' THEN 'річницею хрестин'
        WHEN 'birthday' THEN 'днем народження'
        WHEN 'anniversary' THEN 'ювілеєм'
        WHEN 'corporate' THEN 'річницею свята'
        ELSE 'пам''ятною датою'
      END);

    INSERT INTO public.client_greeting_log (client_event_id, notify_year, kind)
    VALUES (_rec.id, _year, 'client');

    INSERT INTO public.notifications (user_id, message, link)
    VALUES (_rec.client_user_id,
      '🎉 Вітаємо з ' || _label || '! ' || _years || ' — нехай цей день дарує тепло. Команда Спільнота B&C',
      '/notifications');

    PERFORM public.invoke_push_notification(
      _rec.client_user_id,
      '🎉 Вітаємо!',
      'Вітаємо з ' || _label || '! Команда Спільнота B&C',
      '/notifications');

    _greetings := _greetings + 1;
  END LOOP;

  -- prep reminders to admins
  FOR _rec IN
    SELECT e.*, COALESCE(NULLIF(TRIM(cp.display_name), ''), NULLIF(TRIM(u.full_name), ''), 'Клієнт') AS client_name
    FROM public.client_events e
    JOIN public.users u ON u.id = e.client_user_id
    LEFT JOIN public.client_profiles cp ON cp.user_id = e.client_user_id
    WHERE e.greeting_enabled
      AND EXTRACT(MONTH FROM e.event_date) = EXTRACT(MONTH FROM (_today + e.prep_days))
      AND EXTRACT(DAY FROM e.event_date) = EXTRACT(DAY FROM (_today + e.prep_days))
      AND NOT EXISTS (
        SELECT 1 FROM public.client_greeting_log l
        WHERE l.client_event_id = e.id
          AND l.notify_year = EXTRACT(YEAR FROM (_today + e.prep_days))::int
          AND l.kind = 'admin_prep'
      )
  LOOP
    _label := COALESCE(NULLIF(TRIM(_rec.title), ''),
      CASE _rec.event_type
        WHEN 'wedding' THEN 'річниця весілля'
        WHEN 'christening' THEN 'річниця хрестин'
        WHEN 'birthday' THEN 'день народження'
        WHEN 'anniversary' THEN 'ювілей'
        WHEN 'corporate' THEN 'річниця свята'
        ELSE 'пам''ятна дата'
      END);

    INSERT INTO public.client_greeting_log (client_event_id, notify_year, kind)
    VALUES (_rec.id, EXTRACT(YEAR FROM (_today + _rec.prep_days))::int, 'admin_prep');

    FOR _admin IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('admin','founder')
    LOOP
      INSERT INTO public.notifications (user_id, message, link)
      VALUES (_admin.user_id,
        '🎵 Через ' || _rec.prep_days || ' дн. у клієнта ' || _rec.client_name || ' — ' || _label || '. Час підготувати привітання.',
        '/admin/clients');

      PERFORM public.invoke_push_notification(
        _admin.user_id,
        '🎵 Підготувати привітання',
        _rec.client_name || ': ' || _label || ' через ' || _rec.prep_days || ' дн.',
        '/admin/clients');
    END LOOP;

    _preps := _preps + 1;
  END LOOP;

  RETURN jsonb_build_object('date', _today, 'client_greetings', _greetings, 'admin_prep_reminders', _preps);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_client_anniversaries() FROM anon, authenticated;
