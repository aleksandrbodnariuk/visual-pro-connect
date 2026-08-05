-- Лог сповіщень про дні народження друзів (для ідемпотентності)
CREATE TABLE public.friend_birthday_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  birthday_user_id uuid NOT NULL,
  notify_year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_id, birthday_user_id, notify_year)
);

GRANT SELECT ON public.friend_birthday_notifications TO authenticated;
GRANT ALL ON public.friend_birthday_notifications TO service_role;

ALTER TABLE public.friend_birthday_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own birthday notification log"
ON public.friend_birthday_notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

CREATE INDEX idx_fbn_recipient ON public.friend_birthday_notifications (recipient_id, notify_year);

-- Функція: сповіщає друзів про дні народження, що настали сьогодні
CREATE OR REPLACE FUNCTION public.notify_friend_birthdays()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Europe/Kyiv')::date;
  _year integer := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/Kyiv'))::int;
  _rec record;
  _count integer := 0;
BEGIN
  FOR _rec IN
    SELECT DISTINCT
      f.friend_id AS recipient_id,
      b.id AS birthday_user_id,
      COALESCE(NULLIF(TRIM(b.full_name), ''), 'Користувач') AS birthday_name
    FROM public.users b
    JOIN LATERAL (
      SELECT CASE WHEN fr.sender_id = b.id THEN fr.receiver_id ELSE fr.sender_id END AS friend_id
      FROM public.friend_requests fr
      WHERE fr.status = 'accepted'
        AND (fr.sender_id = b.id OR fr.receiver_id = b.id)
    ) f ON TRUE
    JOIN public.users r ON r.id = f.friend_id
    WHERE b.date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM b.date_of_birth) = EXTRACT(MONTH FROM _today)
      AND EXTRACT(DAY FROM b.date_of_birth) = EXTRACT(DAY FROM _today)
      AND COALESCE(b.is_blocked, false) = false
      AND COALESCE(r.is_blocked, false) = false
      AND f.friend_id <> b.id
      AND NOT EXISTS (
        SELECT 1 FROM public.friend_birthday_notifications l
        WHERE l.recipient_id = f.friend_id
          AND l.birthday_user_id = b.id
          AND l.notify_year = _year
      )
  LOOP
    INSERT INTO public.friend_birthday_notifications (recipient_id, birthday_user_id, notify_year)
    VALUES (_rec.recipient_id, _rec.birthday_user_id, _year)
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      INSERT INTO public.notifications (user_id, message, link)
      VALUES (
        _rec.recipient_id,
        '🎂 Сьогодні день народження у ' || _rec.birthday_name || '. Привітайте!',
        '/profile/' || _rec.birthday_user_id::text
      );

      PERFORM public.invoke_push_notification(
        _rec.recipient_id,
        '🎂 День народження',
        'Сьогодні святкує ' || _rec.birthday_name || '. Привітайте!',
        '/profile/' || _rec.birthday_user_id::text
      );

      _count := _count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('date', _today, 'notifications_created', _count);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_friend_birthdays() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_friend_birthdays() TO service_role;

-- Щоденний запуск о 09:00 за Києвом (06:00 UTC)
SELECT cron.unschedule('notify-friend-birthdays-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-friend-birthdays-daily');

SELECT cron.schedule(
  'notify-friend-birthdays-daily',
  '0 6 * * *',
  $$SELECT public.notify_friend_birthdays();$$
);