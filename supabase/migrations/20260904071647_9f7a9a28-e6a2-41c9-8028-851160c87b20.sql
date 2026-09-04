CREATE TABLE public.vip_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Без назви',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_documents TO authenticated;
GRANT ALL ON public.vip_documents TO service_role;

CREATE INDEX idx_vip_documents_user_sorted ON public.vip_documents (user_id, updated_at DESC);

ALTER TABLE public.vip_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VIP owners can view their documents"
  ON public.vip_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid())));

CREATE POLICY "VIP owners can create documents"
  ON public.vip_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid())));

CREATE POLICY "VIP owners can update their documents"
  ON public.vip_documents FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid())))
  WITH CHECK (user_id = auth.uid() AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid())));

CREATE POLICY "VIP owners can delete their documents"
  ON public.vip_documents FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND (public.has_active_vip(auth.uid()) OR public.is_user_admin(auth.uid())));

CREATE POLICY "Admins full access to vip_documents"
  ON public.vip_documents FOR ALL TO authenticated
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_vip_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vip_documents_updated_at
  BEFORE UPDATE ON public.vip_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vip_documents_updated_at();