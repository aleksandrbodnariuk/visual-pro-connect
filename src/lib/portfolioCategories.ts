import { Heart, GraduationCap, Camera, Church, Sparkles, Cake, Folder } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PortfolioCategoryKey =
  | "wedding"
  | "graduation"
  | "photoshoot"
  | "baptism"
  | "engagement"
  | "birthday";

export interface PortfolioCategoryDef {
  key: PortfolioCategoryKey;
  label: string;
  icon: LucideIcon;
}

export const PORTFOLIO_CATEGORIES: PortfolioCategoryDef[] = [
  { key: "wedding", label: "Весілля", icon: Heart },
  { key: "graduation", label: "Випуск", icon: GraduationCap },
  { key: "photoshoot", label: "Фотосесія", icon: Camera },
  { key: "baptism", label: "Хрестини", icon: Church },
  { key: "engagement", label: "Вінчання", icon: Sparkles },
  { key: "birthday", label: "Дні народження", icon: Cake },
];

export const OTHER_CATEGORY_LABEL = "Інше";
export const OtherCategoryIcon = Folder;

export function getCategoryLabel(key: string | null | undefined): string {
  if (!key) return OTHER_CATEGORY_LABEL;
  return PORTFOLIO_CATEGORIES.find((c) => c.key === key)?.label ?? OTHER_CATEGORY_LABEL;
}

export function getCategoryIcon(key: string | null | undefined): LucideIcon {
  if (!key) return OtherCategoryIcon;
  return PORTFOLIO_CATEGORIES.find((c) => c.key === key)?.icon ?? OtherCategoryIcon;
}
