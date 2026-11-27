UPDATE public.site_settings
SET value = '1', updated_at = now()
WHERE id = 'android-apk-build'
  AND value = '2'
  AND EXISTS (
    SELECT 1 FROM public.site_settings
    WHERE id = 'android-apk-path'
      AND value = 'c836df06-8923-468e-b4c1-9331cadbe183/android/e1130e74-bdd0-4703-9d69-4c93ca081d95-spilnota-bc.apk'
  );