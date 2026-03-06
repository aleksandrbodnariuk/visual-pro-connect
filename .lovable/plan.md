

# Аудит системи App Icon Badge -- Причини та рішення

## Кореневі причини

Після аналізу всього ланцюга виявлено **одну критичну проблему**:

### Push-сповіщення ніколи не активуються

Файл `src/lib/pushNotifications.ts` містить готові функції `subscribeToPush()` та `requestNotificationPermission()`, але **жоден компонент їх не викликає**. Підписка на push ніколи не створюється.

Це означає:
- Service Worker **ніколи не отримує `push` event** коли додаток закритий
- Код в SW що інкрементує badge (`badgeCount++` + `setAppBadge`) ніколи не спрацьовує
- Звук теж не відтворюється, бо `PUSH_RECEIVED` message ніколи не надсилається

### Поточна архітектура badge працює ТІЛЬКИ коли додаток відкритий

```text
Додаток ВІДКРИТИЙ:
  Supabase Realtime → useUnreadMessages → updateAppBadge ✅

Додаток ЗАКРИТИЙ:
  Нове повідомлення → ??? → Нічого не відбувається ❌
```

Для роботи badge при закритому додатку потрібен повний push pipeline:

```text
Нове повідомлення в БД
  ↓
Supabase Database Webhook / Trigger
  ↓
Edge Function (send Web Push)
  ↓
SW push event → setAppBadge + showNotification
```

## План реалізації

### 1. Створити таблицю `push_subscriptions` в Supabase

Поля: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `updated_at`. RLS: кожен користувач бачить тільки свої записи.

### 2. Створити Edge Function для відправки Web Push

Edge Function `send-push-notification` буде:
- Приймати `user_id`, `title`, `body`, `url`
- Діставати підписки з `push_subscriptions`
- Надсилати Web Push через стандартний протокол (з `web-push` бібліотекою)

### 3. Створити Database Webhook на таблицю `messages`

При `INSERT` в `messages` викликати Edge Function з `receiver_id` як цільовим користувачем. Це забезпечить відправку push навіть коли додаток закритий.

### 4. Активувати підписку на push в frontend

- При першому вході або в налаштуваннях запитувати дозвіл через `requestNotificationPermission()`
- Викликати `subscribeToPush(vapidPublicKey)` для реєстрації підписки
- Зберігати VAPID public key в `site_settings` або `.env`

### 5. Згенерувати VAPID ключі

Пара ключів (public + private) потрібна для Web Push протоколу. Public key використовується на frontend, private -- в Edge Function.

### Що можна зробити зараз (без повного push backend)

Як проміжне рішення -- забезпечити що badge оновлюється коли додаток **відкритий у фоні** (вкладка є, але неактивна). Це вже працює через Realtime. Також можна додати UI для запиту дозволу на сповіщення, щоб підготувати інфраструктуру.

**Без серверного компонента (Edge Function + VAPID + webhook) badge при повністю закритому додатку працювати не може** -- це обмеження архітектури Web Push, а не баг коду.

