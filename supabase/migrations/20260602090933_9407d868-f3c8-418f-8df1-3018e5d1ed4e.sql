
-- Internal secret for storage cleanup edge function
INSERT INTO public.app_secrets(key, value)
VALUES ('storage_cleanup_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Helper: extract storage path from public URL
CREATE OR REPLACE FUNCTION public._path_from_url(_url text, _bucket text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _url IS NULL OR _bucket IS NULL THEN NULL
    ELSE NULLIF(split_part(split_part(_url, '/storage/v1/object/public/' || _bucket || '/', 2), '?', 1), '')
  END
$$;

-- Helper: enqueue async storage cleanup via pg_net
CREATE OR REPLACE FUNCTION public.enqueue_storage_cleanup(_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _secret text;
BEGIN
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RETURN; END IF;
  SELECT value INTO _secret FROM public.app_secrets WHERE key = 'storage_cleanup_secret';
  IF _secret IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/storage-admin',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-internal-secret', _secret
    ),
    body := jsonb_build_object('action','delete-paths','items',_items)
  );
END
$$;

-- Trigger functions per table
CREATE OR REPLACE FUNCTION public.tr_cleanup_posts_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p text; _items jsonb := '[]'::jsonb;
BEGIN
  _p := public._path_from_url(OLD.media_url, 'posts');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','posts','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_portfolio_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  FOREACH _p IN ARRAY ARRAY[
    public._path_from_url(OLD.media_url, 'portfolio'),
    public._path_from_url(OLD.media_preview_url, 'portfolio'),
    public._path_from_url(OLD.media_display_url, 'portfolio')
  ] LOOP
    IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','portfolio','path',_p)); END IF;
  END LOOP;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_marketplace_listings_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.cover_image_url, 'marketplace');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','marketplace','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_marketplace_images_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.image_url, 'marketplace');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','marketplace','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_messages_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.attachment_url, 'message-attachments');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','message-attachments','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_support_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.attachment_url, 'support-attachments');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','support-attachments','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_user_files_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.file_url, 'posts');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','posts','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_users_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.avatar_url, 'avatars');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','avatars','path',_p)); END IF;
  _p := public._path_from_url(OLD.banner_url, 'banners');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','banners','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_conversations_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.avatar_url, 'group-avatars');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','group-avatars','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.tr_cleanup_vip_banner_storage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _items jsonb := '[]'::jsonb; _p text;
BEGIN
  _p := public._path_from_url(OLD.custom_banner_url, 'banners');
  IF _p IS NOT NULL THEN _items := _items || jsonb_build_array(jsonb_build_object('bucket','banners','path',_p)); END IF;
  PERFORM public.enqueue_storage_cleanup(_items);
  RETURN OLD;
END $$;

-- Attach triggers (drop first for idempotency)
DROP TRIGGER IF EXISTS trg_cleanup_posts_storage ON public.posts;
CREATE TRIGGER trg_cleanup_posts_storage AFTER DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_posts_storage();

DROP TRIGGER IF EXISTS trg_cleanup_portfolio_storage ON public.portfolio;
CREATE TRIGGER trg_cleanup_portfolio_storage AFTER DELETE ON public.portfolio
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_portfolio_storage();

DROP TRIGGER IF EXISTS trg_cleanup_marketplace_listings_storage ON public.marketplace_listings;
CREATE TRIGGER trg_cleanup_marketplace_listings_storage AFTER DELETE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_marketplace_listings_storage();

DROP TRIGGER IF EXISTS trg_cleanup_marketplace_images_storage ON public.marketplace_listing_images;
CREATE TRIGGER trg_cleanup_marketplace_images_storage AFTER DELETE ON public.marketplace_listing_images
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_marketplace_images_storage();

DROP TRIGGER IF EXISTS trg_cleanup_messages_storage ON public.messages;
CREATE TRIGGER trg_cleanup_messages_storage AFTER DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_messages_storage();

DROP TRIGGER IF EXISTS trg_cleanup_support_storage ON public.support_tickets;
CREATE TRIGGER trg_cleanup_support_storage AFTER DELETE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_support_storage();

DROP TRIGGER IF EXISTS trg_cleanup_user_files_storage ON public.user_files;
CREATE TRIGGER trg_cleanup_user_files_storage AFTER DELETE ON public.user_files
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_user_files_storage();

DROP TRIGGER IF EXISTS trg_cleanup_users_storage ON public.users;
CREATE TRIGGER trg_cleanup_users_storage AFTER DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_users_storage();

DROP TRIGGER IF EXISTS trg_cleanup_conversations_storage ON public.conversations;
CREATE TRIGGER trg_cleanup_conversations_storage AFTER DELETE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_conversations_storage();

DROP TRIGGER IF EXISTS trg_cleanup_vip_banner_storage ON public.user_vip_memberships;
CREATE TRIGGER trg_cleanup_vip_banner_storage AFTER DELETE ON public.user_vip_memberships
FOR EACH ROW EXECUTE FUNCTION public.tr_cleanup_vip_banner_storage();

-- RPC: database size info (admin only via RLS-bypassing security definer + role check)
CREATE OR REPLACE FUNCTION public.get_storage_admin_db_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _db_size bigint;
  _tables jsonb;
BEGIN
  SELECT (founder_admin = true OR is_admin = true)
    INTO _is_admin
    FROM public.users
    WHERE id = auth.uid();
  IF NOT COALESCE(_is_admin, false) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT pg_database_size(current_database()) INTO _db_size;

  SELECT jsonb_agg(jsonb_build_object(
    'table', relname,
    'bytes', pg_total_relation_size(c.oid),
    'rows', COALESCE(s.n_live_tup, 0)
  ) ORDER BY pg_total_relation_size(c.oid) DESC)
    INTO _tables
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
   WHERE n.nspname = 'public' AND c.relkind = 'r';

  RETURN jsonb_build_object('db_bytes', _db_size, 'tables', COALESCE(_tables, '[]'::jsonb));
END
$$;

GRANT EXECUTE ON FUNCTION public.get_storage_admin_db_stats() TO authenticated;
