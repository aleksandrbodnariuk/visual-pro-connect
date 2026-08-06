export const CLIENT_TYPES = [
  { value: "wedding", label: "Наречені (весілля)" },
  { value: "christening", label: "Хрестини" },
  { value: "birthday", label: "День народження" },
  { value: "anniversary", label: "Ювілей" },
  { value: "corporate", label: "Корпоратив" },
  { value: "graduation", label: "Випускний" },
  { value: "other", label: "Інше" },
] as const;

export const EVENT_TYPES = [
  { value: "wedding", label: "Річниця весілля", emoji: "💍" },
  { value: "christening", label: "Річниця хрестин", emoji: "🕊️" },
  { value: "birthday", label: "День народження", emoji: "🎂" },
  { value: "anniversary", label: "Ювілей", emoji: "🥂" },
  { value: "corporate", label: "Річниця свята", emoji: "🎊" },
  { value: "other", label: "Пам'ятна дата", emoji: "📅" },
] as const;

export const clientTypeLabel = (v?: string | null) =>
  CLIENT_TYPES.find((t) => t.value === v)?.label ?? "Інше";

export const eventTypeLabel = (v?: string | null) =>
  EVENT_TYPES.find((t) => t.value === v)?.label ?? "Пам'ятна дата";

export const eventTypeEmoji = (v?: string | null) =>
  EVENT_TYPES.find((t) => t.value === v)?.emoji ?? "📅";

export interface ClientProfileRow {
  id: string;
  user_id: string;
  client_type: string;
  display_name: string | null;
  partner_name: string | null;
  city: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClientEventRow {
  id: string;
  client_user_id: string;
  event_type: string;
  event_date: string;
  title: string | null;
  notes: string | null;
  greeting_enabled: boolean;
  prep_days: number;
}

export interface UpcomingGreeting {
  event_id: string;
  client_user_id: string;
  client_name: string;
  avatar_url: string | null;
  client_type: string;
  event_type: string;
  event_date: string;
  title: string | null;
  notes: string | null;
  prep_days: number;
  greeting_enabled: boolean;
  next_date: string;
  days_left: number;
  years_count: number;
}