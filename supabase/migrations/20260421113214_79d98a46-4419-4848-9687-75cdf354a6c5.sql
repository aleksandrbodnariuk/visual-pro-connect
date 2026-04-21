
DROP FUNCTION IF EXISTS public.approve_certificate_purchase(uuid, text);

CREATE FUNCTION public.approve_certificate_purchase(
  _request_id uuid,
  _admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _target_user uuid;
  _cert_id uuid;
  _buyer_name text;
  _tier_label text;
BEGIN
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Доступ заборонено';
  END IF;

  SELECT * INTO _req FROM public.certificate_purchase_requests WHERE id = _request_id FOR UPDATE;
  IF _req IS NULL THEN RAISE EXCEPTION 'Заявку не знайдено'; END IF;
  IF _req.status != 'pending' THEN RAISE EXCEPTION 'Заявку вже оброблено'; END IF;

  _target_user := COALESCE(_req.recipient_id, _req.buyer_id);

  INSERT INTO public.user_certificates (
    user_id, is_active, discount_type, discount_value, note,
    tier, purchased_by, is_gift, purchase_amount_uah
  ) VALUES (
    _target_user, true, 'uah', _req.amount_uah,
    'Сертифікат ' || _req.tier || ' на ' || _req.amount_uah || '₴',
    _req.tier, _req.buyer_id, _req.is_gift, _req.amount_uah
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_active = true,
    discount_type = 'uah',
    discount_value = CASE
      WHEN public.user_certificates.discount_type = 'uah' AND public.user_certificates.is_active
      THEN public.user_certificates.discount_value + EXCLUDED.discount_value
      ELSE EXCLUDED.discount_value
    END,
    note = EXCLUDED.note,
    tier = EXCLUDED.tier,
    purchased_by = EXCLUDED.purchased_by,
    is_gift = EXCLUDED.is_gift,
    purchase_amount_uah = EXCLUDED.purchase_amount_uah,
    updated_at = now()
  RETURNING id INTO _cert_id;

  UPDATE public.certificate_purchase_requests
  SET status = 'approved', approved_at = now(), approved_by = auth.uid(),
      admin_note = _admin_note, certificate_id = _cert_id, updated_at = now()
  WHERE id = _request_id;

  SELECT COALESCE(full_name, 'Користувач') INTO _buyer_name FROM public.users WHERE id = _req.buyer_id;
  _tier_label := COALESCE((SELECT label FROM public.certificate_tiers WHERE id = _req.tier), _req.tier);

  IF _req.is_gift AND _req.recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, message, is_read, link)
    VALUES (_req.recipient_id,
            '🎁 ' || _buyer_name || ' подарував(ла) вам сертифікат на ' || _req.amount_uah || '₴ знижки!',
            false, '/sertyfikaty/moi');
    INSERT INTO public.notifications (user_id, message, is_read, link)
    VALUES (_req.buyer_id,
            'Ваш подарунок (сертифікат ' || _tier_label || ' на ' || _req.amount_uah || '₴) активовано',
            false, '/sertyfikaty/moi');
    BEGIN
      PERFORM net.http_post(
        url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'),
        body := jsonb_build_object('user_id', _req.recipient_id::text,
          'title', '🎁 Подарунковий сертифікат',
          'body', _buyer_name || ' подарував(ла) вам знижку ' || _req.amount_uah || '₴',
          'url', '/sertyfikaty/moi')
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    INSERT INTO public.notifications (user_id, message, is_read, link)
    VALUES (_req.buyer_id,
            'Ваш сертифікат ' || _tier_label || ' на ' || _req.amount_uah || '₴ знижки активовано!',
            false, '/sertyfikaty/moi');
    BEGIN
      PERFORM net.http_post(
        url := 'https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U'),
        body := jsonb_build_object('user_id', _req.buyer_id::text,
          'title', 'Сертифікат активовано',
          'body', 'Знижка ' || _req.amount_uah || '₴ доступна на вашому профілі',
          'url', '/sertyfikaty/moi')
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END;
$$;
