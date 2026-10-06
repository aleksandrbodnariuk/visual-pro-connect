export const FIRST_AD_AFTER = 4;
export const AD_EVERY = 9; // між 8 і 10 звичайними дописами

export type FeedItem<P, A> = { kind: 'post'; post: P } | { kind: 'ad'; ad: A; slot: number };

/** Вплітає рекламу: перша після 4-го допису, далі кожні 9 дописів; оголошення чергуються. */
export function interleaveAds<P, A>(posts: P[], ads: A[], rotation = 0): FeedItem<P, A>[] {
  const out: FeedItem<P, A>[] = [];
  let slot = 0;
  posts.forEach((post, i) => {
    out.push({ kind: 'post', post });
    const n = i + 1;
    if (ads.length && n >= FIRST_AD_AFTER && (n - FIRST_AD_AFTER) % AD_EVERY === 0) {
      out.push({ kind: 'ad', ad: ads[(slot + rotation) % ads.length], slot });
      slot++;
    }
  });
  return out;
}

export const AD_STATUS_LABELS: Record<string, string> = {
  draft: 'Чернетка',
  pending_approval: 'На перевірці',
  active: 'Активна',
  paused: 'Призупинена',
  rejected: 'Відхилена',
  completed: 'Завершена',
};

export const CTA_OPTIONS = ['Детальніше', 'Замовити', 'Купити', 'Приєднатися', 'Зареєструватися', 'Перейти на сайт'];

export interface FeedAd {
  id: string;
  author_id: string;
  advertiser_name: string;
  title: string;
  description: string;
  media_url: string | null;
  cta_text: string;
  cta_url: string;
  status: string;
  rejection_reason: string | null;
  start_date: string;
  end_date: string;
  target_views: number | null;
  views_count: number;
  clicks_count: number;
  created_at: string;
}

/** Показує фактичний стан з урахуванням дат і ліміту показів. */
export function effectiveAdStatus(ad: Pick<FeedAd, 'status' | 'start_date' | 'end_date' | 'target_views' | 'views_count'>, now = new Date()): string {
  if (ad.status !== 'active') return ad.status;
  if (new Date(ad.end_date) <= now) return 'completed';
  if (ad.target_views != null && ad.views_count >= ad.target_views) return 'completed';
  if (new Date(ad.start_date) > now) return 'scheduled';
  return 'active';
}
