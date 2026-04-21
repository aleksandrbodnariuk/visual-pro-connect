
-- Create vip_reminders table
CREATE TABLE public.vip_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own reminders"
ON public.vip_reminders FOR SELECT
USING (user_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Users can create own reminders"
ON public.vip_reminders FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
ON public.vip_reminders FOR UPDATE
USING (user_id = auth.uid() OR is_user_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Users can delete own reminders"
ON public.vip_reminders FOR DELETE
USING (user_id = auth.uid() OR is_user_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_vip_reminders_user ON public.vip_reminders (user_id, remind_at DESC);
CREATE INDEX idx_vip_reminders_pending ON public.vip_reminders (remind_at, status) WHERE status = 'active' AND notified_at IS NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_vip_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_vip_reminders_updated_at
BEFORE UPDATE ON public.vip_reminders
FOR EACH ROW EXECUTE FUNCTION public.set_vip_reminders_updated_at();
