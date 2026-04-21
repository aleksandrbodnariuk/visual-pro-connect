export interface CertificateTier {
  id: "basic" | "standard" | "premium";
  label: string;
  price: number; // UAH
  discount: number; // percent
  description: string;
  perks: string[];
  highlight?: boolean;
  gradient: string;
}

export const CERTIFICATE_TIERS: CertificateTier[] = [
  {
    id: "basic",
    label: "Базовий",
    price: 500,
    discount: 5,
    description: "Знижка 5% на всі послуги фото, відео та музика",
    perks: [
      "5% знижка на послуги наших фахівців",
      "Публічний бейдж біля вашого аватара",
      "Без терміну дії",
    ],
    gradient: "from-slate-500 to-slate-700",
  },
  {
    id: "standard",
    label: "Стандарт",
    price: 1500,
    discount: 10,
    description: "Знижка 10% — найпопулярніший вибір",
    perks: [
      "10% знижка на послуги наших фахівців",
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
    discount: 15,
    description: "Максимальна знижка 15% для постійних клієнтів",
    perks: [
      "15% знижка на послуги наших фахівців",
      "Преміум-бейдж біля вашого аватара",
      "Пріоритетна підтримка",
      "Можливість дарувати знижку друзям",
      "Без терміну дії",
    ],
    gradient: "from-purple-500 via-fuchsia-500 to-pink-500",
  },
];

export const getTier = (id: string) => CERTIFICATE_TIERS.find((t) => t.id === id);