CREATE TABLE public.friend_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_lists_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
  CONSTRAINT friend_lists_owner_name_uniq UNIQUE (owner_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_lists TO authenticated;
GRANT ALL ON public.friend_lists TO service_role;
ALTER TABLE public.friend_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own friend lists" ON public.friend_lists
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX friend_lists_owner_idx ON public.friend_lists(owner_id, sort_order);

CREATE TABLE public.friend_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.friend_lists(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_list_members_uniq UNIQUE (list_id, friend_id)
);
GRANT SELECT, INSERT, DELETE ON public.friend_list_members TO authenticated;
GRANT ALL ON public.friend_list_members TO service_role;
ALTER TABLE public.friend_list_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own list members" ON public.friend_list_members
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owner adds to own lists" ON public.friend_list_members
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.friend_lists l WHERE l.id = list_id AND l.owner_id = auth.uid())
  );
CREATE POLICY "Owner removes from own lists" ON public.friend_list_members
  FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX friend_list_members_owner_idx ON public.friend_list_members(owner_id);

CREATE OR REPLACE FUNCTION public.friend_lists_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER friend_lists_touch BEFORE UPDATE ON public.friend_lists
  FOR EACH ROW EXECUTE FUNCTION public.friend_lists_touch_updated_at();