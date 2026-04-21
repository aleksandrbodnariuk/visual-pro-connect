import {
  Heart,
  GraduationCap,
  Camera,
  Church,
  Sparkles,
  Cake,
  Folder,
  Music,
  Video,
  Users,
  Star,
  UtensilsCrossed,
  Car,
  Flower2,
  Gift,
  PartyPopper,
  Briefcase,
  Baby,
  Mic,
  Plane,
  Home,
  Building2,
  Trophy,
  BookOpen,
  Book,
  BookImage,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PortfolioCategoryDef {
  key: string;
  label: string;
  icon: LucideIcon;
}

/** All icons available for portfolio categories (admin can choose any). */
export const PORTFOLIO_ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  GraduationCap,
  Camera,
  Church,
  Sparkles,
  Cake,
  Folder,
  Music,
  Video,
  Users,
  Star,
  UtensilsCrossed,
  Car,
  Flower2,
  Gift,
  PartyPopper,
  Briefcase,
  Baby,
  Mic,
  Plane,
  Home,
  Building2,
  Trophy,
  BookOpen,
  Book,
  BookImage,
};

export const PORTFOLIO_AVAILABLE_ICONS = Object.keys(PORTFOLIO_ICON_MAP);

export const OTHER_CATEGORY_LABEL = "Інше";
export const OtherCategoryIcon = Folder;

export function getPortfolioIconComponent(name: string | null | undefined): LucideIcon {
  if (!name) return OtherCategoryIcon;
  return PORTFOLIO_ICON_MAP[name] ?? OtherCategoryIcon;
}

/**
 * Helpers that take the dynamically-loaded category list as input.
 * Components fetch categories via `usePortfolioCategories()` and pass them in.
 */
export function getCategoryLabel(
  categories: PortfolioCategoryDef[],
  key: string | null | undefined,
): string {
  if (!key) return OTHER_CATEGORY_LABEL;
  return categories.find((c) => c.key === key)?.label ?? OTHER_CATEGORY_LABEL;
}

export function getCategoryIcon(
  categories: PortfolioCategoryDef[],
  key: string | null | undefined,
): LucideIcon {
  if (!key) return OtherCategoryIcon;
  return categories.find((c) => c.key === key)?.icon ?? OtherCategoryIcon;
}
