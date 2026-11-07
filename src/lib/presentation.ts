export type PresentationPhase = 'before' | 'live' | 'after';

/** Етап гостьової презентації за поточним часом. */
export function presentationPhase(now: number, startMs: number, durationMinutes: number): PresentationPhase {
  if (now < startMs) return 'before';
  if (now < startMs + durationMinutes * 60000) return 'live';
  return 'after';
}

/** Перетворює посилання YouTube на адресу вбудованого плеєра; інші — null (відкриваються кнопкою). */
export function embedUrl(link: string): string | null {
  try {
    const u = new URL(link);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com') id = u.searchParams.get('v') || u.pathname.match(/\/(?:live|embed|shorts)\/([\w-]+)/)?.[1] || null;
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  } catch { return null; }
}

export const presentationLink = (origin: string, eventId: string, refUserId?: string | null) =>
  `${origin}/presentation/${eventId}${refUserId ? `?ref=${refUserId}` : ''}`;
