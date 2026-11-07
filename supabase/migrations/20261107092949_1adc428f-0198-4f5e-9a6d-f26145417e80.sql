ALTER TABLE public.team_materials ADD COLUMN IF NOT EXISTS slides text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.team_events ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.team_materials(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_public_presentation(_event_id uuid, _ref uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE e record; o record; inv jsonb := NULL; ph text; sl text[] := '{}';
BEGIN
  SELECT * INTO e FROM public.team_events WHERE id = _event_id AND is_public;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF now() > COALESCE(e.public_until, e.starts_at + make_interval(mins => e.duration_minutes) + interval '1 day') THEN
    RETURN jsonb_build_object('expired', true, 'title', e.title);
  END IF;
  SELECT id, name, logo_url INTO o FROM public.organizations WHERE id = e.organization_id;
  IF e.material_id IS NOT NULL THEN
    SELECT m.slides INTO sl FROM public.team_materials m WHERE m.id = e.material_id AND m.organization_id = e.organization_id;
  END IF;
  IF _ref IS NOT NULL AND public.is_org_member(e.organization_id, _ref) THEN
    SELECT phone INTO ph FROM public.team_partners WHERE organization_id = e.organization_id AND user_id = _ref LIMIT 1;
    SELECT jsonb_build_object('id', u.id, 'name', u.full_name, 'avatar_url', u.avatar_url, 'phone', ph)
      INTO inv FROM public.users u WHERE u.id = _ref;
  END IF;
  RETURN jsonb_build_object('expired', false, 'id', e.id, 'title', e.title, 'kind', e.kind, 'starts_at', e.starts_at,
    'duration_minutes', e.duration_minutes, 'location', e.location, 'link', e.link, 'description', e.description,
    'org_name', o.name, 'org_logo', o.logo_url, 'inviter', inv, 'slides', to_jsonb(COALESCE(sl, '{}')));
END; $function$;

INSERT INTO public.team_materials (organization_id, category, title, body, slides)
SELECT '391c807b-8981-4583-9325-5c048289b2d1', 'presentation', 'Маркетинг-план і продукти Amway',
  'Головна презентація команди: можливості, бренди Nutrilite, eSpring, iCook, Artistry, рівень Діамант.',
  ARRAY['/__l5e/assets-v1/f3d99509-0c7b-4997-a427-156699d61ef1/mp_slide_01.webp','/__l5e/assets-v1/5125a7f8-222c-41f9-9b57-81cb58537643/mp_slide_02.webp','/__l5e/assets-v1/771b0917-9655-4e36-ad4d-02441276653a/mp_slide_03.webp','/__l5e/assets-v1/6fc89e7e-88b2-4d1c-af17-b3322400637d/mp_slide_04.webp','/__l5e/assets-v1/30e21f80-dddf-4320-94ef-46d4b7862468/mp_slide_05.webp','/__l5e/assets-v1/b28a2a77-70cc-4a5b-be0d-d617fa3f885d/mp_slide_06.webp','/__l5e/assets-v1/35f32fe8-277b-4c95-96aa-6817327b3a6a/mp_slide_07.webp','/__l5e/assets-v1/4eebd91f-82f8-45f3-9337-42556d85482d/mp_slide_08.webp','/__l5e/assets-v1/12fcb1d7-f95a-4988-a4f0-b30a1fcc8d91/mp_slide_09.webp','/__l5e/assets-v1/4bfaa7d6-3537-45f8-ac8e-834e07c478e9/mp_slide_10.webp','/__l5e/assets-v1/3c488ee1-828c-4f5e-b91a-97ece93d74c3/mp_slide_11.webp','/__l5e/assets-v1/3b374483-ae45-4b5d-abb4-e16178526227/mp_slide_12.webp','/__l5e/assets-v1/6e7c05aa-234a-4541-b1af-a0ed016f659c/mp_slide_13.webp','/__l5e/assets-v1/84cda407-8067-47e6-9f92-7dfabf7d3d44/mp_slide_14.webp','/__l5e/assets-v1/cca72a98-8faa-410f-b3ec-3c0e918a538f/mp_slide_15.webp','/__l5e/assets-v1/586106ab-89c9-491b-9ab9-eb1b35b6aecd/mp_slide_16.webp','/__l5e/assets-v1/45e08008-a41f-42c7-a08d-a253e1940f56/mp_slide_17.webp','/__l5e/assets-v1/9cc97934-8740-4fcc-9ff4-d2d1e11af80d/mp_slide_18.webp','/__l5e/assets-v1/04307fd8-dc99-47fb-81f5-55187ec52c61/mp_slide_19.webp','/__l5e/assets-v1/41afecf1-eb38-47fa-9440-78754b2702d0/mp_slide_20.webp','/__l5e/assets-v1/7879683c-d033-4988-bb62-06192b073fe4/mp_slide_21.webp','/__l5e/assets-v1/0d22eee6-2d42-4d02-a2c0-d9f178de5a1f/mp_slide_22.webp','/__l5e/assets-v1/0c66d48b-7fcd-4aaa-bb01-0de56d64af93/mp_slide_23.webp','/__l5e/assets-v1/1cfa15b8-4e25-4fb6-ae4f-40f935543b34/mp_slide_24.webp']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.team_materials WHERE organization_id = '391c807b-8981-4583-9325-5c048289b2d1' AND title = 'Маркетинг-план і продукти Amway');