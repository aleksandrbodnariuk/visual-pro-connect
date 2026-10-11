CREATE TABLE public.software_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('windows','android')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  version text NOT NULL DEFAULT '1.0' CHECK (char_length(version) <= 40),
  description text CHECK (char_length(description) <= 2000),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  downloads integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.software_releases TO authenticated;
GRANT ALL ON public.software_releases TO service_role;
ALTER TABLE public.software_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "software_read" ON public.software_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "software_admin" ON public.software_releases FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "software_files_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'software');
CREATE POLICY "software_files_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'software' AND public.is_admin(auth.uid()));
CREATE POLICY "software_files_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'software' AND public.is_admin(auth.uid()));
CREATE POLICY "software_files_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'software' AND public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.count_software_download(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE software_releases SET downloads = downloads + 1 WHERE id = _id AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.count_software_download(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_software_download(uuid) TO authenticated;