import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserVip } from "./useUserVip";
import { useVipTiers } from "./useVipTiers";
import { getVipTier } from "@/lib/vipTiers";

export interface VipBenefitsState {
  hasVip: boolean;
  discountPercent: number;
  monthlyBonusUah: number;
  birthdayBonusUah: number;
  lastMonthlyBonusAt: string | null;
  lastBirthdayGiftYear: number | null;
  monthlyAvailable: boolean;
  monthlyNextAvailableAt: string | null;
  birthdayAvailable: boolean;
  isBirthMonth: boolean;
  hasBirthDate: boolean;
}

/**
 * Computes VIP economic benefits for a user.
 * Combines membership data, tier config, and the user's birth date.
 */
export function useVipBenefits(userId: string | null | undefined) {
  const { vip, loading: vipLoading, reload } = useUserVip(userId);
  const { tiers, loading: tiersLoading } = useVipTiers(false);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [loadingBirth, setLoadingBirth] = useState(true);

  const loadBirth = useCallback(async () => {
    if (!userId) {
      setBirthDate(null);
      setLoadingBirth(false);
      return;
    }
    setLoadingBirth(true);
    const { data } = await supabase
      .from("users")
      .select("date_of_birth")
      .eq("id", userId)
      .maybeSingle();
    setBirthDate((data as any)?.date_of_birth || null);
    setLoadingBirth(false);
  }, [userId]);

  useEffect(() => {
    loadBirth();
  }, [loadBirth]);

  const tier = vip ? getVipTier(vip.tier, tiers) : null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const lastMonthly = vip?.last_monthly_bonus_at
    ? new Date(vip.last_monthly_bonus_at)
    : null;
  const monthlyNextAvailable = lastMonthly
    ? new Date(lastMonthly.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const monthlyAvailable =
    !!vip && !!tier && tier.monthly_bonus_uah > 0 &&
    (!monthlyNextAvailable || monthlyNextAvailable <= now);

  const birthMonth = birthDate ? new Date(birthDate).getMonth() + 1 : null;
  const isBirthMonth = !!birthMonth && birthMonth === currentMonth;
  const lastGiftYear = vip?.last_birthday_gift_year ?? null;
  const birthdayAvailable =
    !!vip && !!tier && tier.birthday_bonus_uah > 0 &&
    !!birthDate && isBirthMonth &&
    (lastGiftYear === null || lastGiftYear < currentYear);

  const state: VipBenefitsState = {
    hasVip: !!vip,
    discountPercent: tier?.discount_percent ?? 0,
    monthlyBonusUah: tier?.monthly_bonus_uah ?? 0,
    birthdayBonusUah: tier?.birthday_bonus_uah ?? 0,
    lastMonthlyBonusAt: vip?.last_monthly_bonus_at ?? null,
    lastBirthdayGiftYear: lastGiftYear,
    monthlyAvailable,
    monthlyNextAvailableAt: monthlyNextAvailable
      ? monthlyNextAvailable.toISOString()
      : null,
    birthdayAvailable,
    isBirthMonth,
    hasBirthDate: !!birthDate,
  };

  return {
    ...state,
    loading: vipLoading || tiersLoading || loadingBirth,
    reload: () => {
      reload();
      loadBirth();
    },
  };
}