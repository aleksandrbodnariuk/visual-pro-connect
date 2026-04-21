export interface VipTier {
  id: string;
  label: string;
  price_uah: number;
  duration_days: number;
  description: string;
  perks: string[];
  gradient: string;
  badge_icon: string;
  name_color: string | null;
  banner_animation: string;
  highlight: boolean;
  discount_percent: number;
  monthly_bonus_uah: number;
  birthday_bonus_uah: number;
}

export const FALLBACK_VIP_TIERS: VipTier[] = [
  {
    id: "silver",
    label: "Silver VIP",
    price_uah: 499,
    duration_days: 30,
    description: "Базовий преміум-статус на 1 місяць",
    perks: [
      "Срібний бейдж біля аватара",
      "Анімований банер (shimmer)",
      "Кастомний колір імені",
    ],
    gradient: "from-slate-300 via-slate-400 to-slate-500",
    badge_icon: "Star",
    name_color: "#94a3b8",
    banner_animation: "shimmer",
    highlight: false,
    discount_percent: 10,
    monthly_bonus_uah: 200,
    birthday_bonus_uah: 500,
  },
  {
    id: "gold",
    label: "Gold VIP",
    price_uah: 1299,
    duration_days: 90,
    description: "Золотий статус на 3 місяці",
    perks: [
      "Золотий бейдж",
      "Анімований банер (gold-shimmer)",
      "Преміум-колір імені",
      "Підвищена видимість профілю",
    ],
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    badge_icon: "Crown",
    name_color: "#f59e0b",
    banner_animation: "gold-shimmer",
    highlight: true,
    discount_percent: 15,
    monthly_bonus_uah: 500,
    birthday_bonus_uah: 1000,
  },
  {
    id: "platinum",
    label: "Platinum VIP",
    price_uah: 3999,
    duration_days: 365,
    description: "Платиновий статус на 1 рік",
    perks: [
      "Платиновий бейдж",
      "Епічний анімований банер",
      "Будь-який колір імені",
      "Топ позиції в пошуку",
      "Ексклюзивні емодзі (скоро)",
    ],
    gradient: "from-cyan-300 via-purple-400 to-pink-500",
    badge_icon: "Gem",
    name_color: "#a855f7",
    banner_animation: "platinum-aurora",
    highlight: false,
    discount_percent: 20,
    monthly_bonus_uah: 1000,
    birthday_bonus_uah: 2000,
  },
];

export const getVipTier = (id: string | null | undefined, tiers: VipTier[] = FALLBACK_VIP_TIERS): VipTier | undefined =>
  id ? tiers.find((t) => t.id === id) : undefined;