-- Створюємо таблицю vip_notes (приватний нотатник для VIP-користувачів)
CREATE TABLE public.vip_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'default',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Індекси для швидкого сортування та пошуку
CREATE INDEX idx_vip_notes_user_sorted
  ON public.vip_notes (user_id, is_pinned DESC, updated_at DESC);

CREATE INDEX idx_vip_notes_tags
  ON public.vip_notes USING GIN(tags);

-- Включаємо RLS
ALTER TABLE public.vip_notes ENABLE ROW LEVEL SECURITY;

-- Політики: лише власник з активним VIP (або адмін) має доступ
CREATE POLICY "VIP owners can view their notes"
  ON public.vip_notes
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid()))
  );

CREATE POLICY "VIP owners can create notes"
  ON public.vip_notes
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid()))
  );

CREATE POLICY "VIP owners can update their notes"
  ON public.vip_notes
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid()))
  );

CREATE POLICY "VIP owners can delete their notes"
  ON public.vip_notes
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid()))
  );

CREATE POLICY "Admins full access to vip_notes"
  ON public.vip_notes
  FOR ALL
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

-- Функція + тригер для автоматичного оновлення updated_at
CREATE OR REPLACE FUNCTION public.set_vip_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vip_notes_updated_at
  BEFORE UPDATE ON public.vip_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vip_notes_updated_at();