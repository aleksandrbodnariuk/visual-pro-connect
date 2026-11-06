export const PARTNER_CATEGORIES = [
  { value: "venue", label: "Ресторани та локації" },
  { value: "transport", label: "Автомобілі та кортежі" },
  { value: "decor", label: "Оформлення та флористика" },
  { value: "confectionery", label: "Кондитерські та феєрверки" },
  { value: "host", label: "Ведучі та артисти" },
  { value: "other", label: "Інші послуги" },
] as const;

export const partnerCategoryLabel = (v: string) =>
  PARTNER_CATEGORIES.find((c) => c.value === v)?.label ?? "Інші послуги";

export interface StudioPartner {
  id: string;
  name: string;
  category: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  phone: string | null;
  discount_offer: string | null;
  is_active: boolean;
  sort_order: number;
}

/** Accept only http(s) links so stored URLs can't run scripts. */
export function safeUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
