export interface CertificateTier {
  id: string;
  label: string;
  price: number; // UAH
  description: string;
  perks: string[];
  highlight?: boolean;
  gradient: string;
}

/** Fallback tiers used while DB is loading or if the table is empty. */
export const FALLBACK_CERTIFICATE_TIERS: CertificateTier[] = [
  {
    id: "basic",
    label: "Базовий",
    price: 500,
    description: "Сертифікат на 500₴ знижки на наші послуги",
    perks: [
      "Знижка 500₴ на послуги наших фахівців",
      "Публічний бейдж біля вашого аватара",
      "Без терміну дії",
    ],
    gradient: "from-slate-500 to-slate-700",
  },
  {
    id: "standard",
    label: "Стандарт",
    price: 1500,
    description: "Сертифікат на 1500₴ знижки — найпопулярніший вибір",
    perks: [
      "Знижка 1500₴ на послуги наших фахівців",
      "Помітний бейдж біля вашого аватара",
      "Пріоритетна підтримка",
      "Без терміну дії",
    ],
    highlight: true,
    gradient: "from-amber-400 via-yellow-300 to-amber-600",
  },
  {
    id: "premium",
    label: "Преміум",
    price: 3000,
    description: "Сертифікат на 3000₴ знижки для постійних клієнтів",
    perks: [
      "Знижка 3000₴ на послуги наших фахівців",
      "Преміум-бейдж біля вашого аватара",
      "Пріоритетна підтримка",
      "Можливість дарувати знижку друзям",
      "Без терміну дії",
    ],
    gradient: "from-purple-500 via-fuchsia-500 to-pink-500",
  },
];

/** Backward-compat export. Prefer using `useCertificateTiers()` for live data. */
export const CERTIFICATE_TIERS = FALLBACK_CERTIFICATE_TIERS;

export const getTier = (id: string, tiers: CertificateTier[] = FALLBACK_CERTIFICATE_TIERS) =>
  tiers.find((t) => t.id === id);