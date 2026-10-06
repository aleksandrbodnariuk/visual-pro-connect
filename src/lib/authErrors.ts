// Translate Supabase / OAuth auth errors into clear Ukrainian messages.
export function translateAuthError(raw: unknown, fallback = 'Помилка входу. Спробуйте ще раз.'): string {
  const msg = (typeof raw === 'string' ? raw : (raw as any)?.message || '').toString();
  const code = ((raw as any)?.code || '').toString();
  const m = (msg + ' ' + code).toLowerCase();
  if (!m.trim()) return fallback;

  if (m.includes('invalid login credentials')) return 'Невірний email або пароль. Якщо ви реєструвалися через Google чи Facebook — увійдіть тією ж кнопкою.';
  if (m.includes('email not confirmed')) return 'Email не підтверджено. Перевірте пошту (і папку «Спам») та натисніть посилання підтвердження.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user_already_exists')) return 'Цей email уже зареєстровано. Увійдіть або відновіть пароль.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Вхід через цей сервіс тимчасово недоступний. Скористайтеся email або напишіть у підтримку.';
  if (m.includes('access_denied') || m.includes('access denied') || m.includes('cancel')) return 'Вхід скасовано або доступ не надано. Спробуйте ще раз і підтвердіть дозвіл.';
  if (m.includes('redirect') || m.includes('site url')) return 'Помилка налаштування входу (адреса повернення). Напишіть у підтримку.';
  if (m.includes('email') && (m.includes('missing') || m.includes('not provided') || m.includes('no email'))) return 'Сервіс не передав ваш email. Дозвольте доступ до email у налаштуваннях Facebook/Google або зареєструйтеся через email.';
  if (m.includes('identity is already linked') || m.includes('identity_already_exists')) return 'Цей акаунт Google/Facebook уже прив’язано до іншого користувача.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('over_email_send_rate_limit')) return 'Забагато спроб. Зачекайте кілька хвилин і спробуйте знову.';
  if (m.includes('database error saving new user') || m.includes('unexpected_failure') || m.includes('server_error')) return 'Не вдалося створити профіль. Спробуйте ще раз або напишіть у підтримку.';
  if (m.includes('invalid email') || m.includes('invalid_email')) return 'Невірний формат email.';
  if (m.includes('password') && (m.includes('weak') || m.includes('short') || m.includes('at least'))) return 'Пароль занадто простий.';
  if (m.includes('expired') || m.includes('otp_expired')) return 'Посилання застаріло. Запросіть нове.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Немає з’єднання з сервером. Перевірте інтернет.';
  return fallback;
}

// Reads OAuth / email-link errors that come back in the URL, then cleans the URL.
export function consumeAuthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const err = hash.get('error') || query.get('error');
  if (!err) return null;
  const desc = hash.get('error_description') || query.get('error_description') || '';
  const code = hash.get('error_code') || query.get('error_code') || '';
  ['error', 'error_description', 'error_code'].forEach((k) => query.delete(k));
  const qs = query.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  return translateAuthError({ message: `${err} ${desc}`, code });
}
