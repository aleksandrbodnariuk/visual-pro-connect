CREATE TABLE IF NOT EXISTS public.vip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'general',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  color TEXT NOT NULL DEFAULT 'amber',
  status TEXT NOT NULL DEFAULT 'planned',
  linked_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vip_events_user_starts_idx
  ON public.vip_events (user_id, starts_at);

ALTER TABLE public.vip_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own events"
  ON public.vip_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own events"
  ON public.vip_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own events"
  ON public.vip_events FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own events"
  ON public.vip_events FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage all events"
  ON public.vip_events FOR ALL
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_vip_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vip_events_set_updated_at
  BEFORE UPDATE ON public.vip_events
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_vip_events_updated_at();