import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_VIP_TIERS, type VipTier } from "@/lib/vipTiers";

export interface VipTierRow extends VipTier {
  sort_order: number;
  is_active: boolean;
}

const rowToTier = (r: any): VipTier => ({
  id: r.id,
  label: r.label,
  price_uah: Number(r.price_uah),
  duration_days: Number(r.duration_days),
  description: r.description || "",
  perks: Array.isArray(r.perks) ? r.perks : [],
  gradient: r.gradient,
  badge_icon: r.badge_icon || "Crown",
  name_color: r.name_color,
  banner_animation: r.banner_animation || "shimmer",
  highlight: !!r.highlight,
  discount_percent: Number(r.discount_percent || 0),
  monthly_bonus_uah: Number(r.monthly_bonus_uah || 0),
  birthday_bonus_uah: Number(r.birthday_bonus_uah || 0),
});

/**
 * Loads VIP tiers from the database with realtime updates.
 */
export function useVipTiers(activeOnly = true) {
  const [tiers, setTiers] = useState<VipTier[]>(FALLBACK_VIP_TIERS);
  const [rows, setRows] = useState<VipTierRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase
      .from("vip_tiers" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error || !data || data.length === 0) {
      setTiers(FALLBACK_VIP_TIERS);
      setRows([]);
    } else {
      const list = data as unknown as VipTierRow[];
      setRows(list);
      setTiers(list.map(rowToTier));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("vip-tiers-" + (activeOnly ? "a" : "all"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vip_tiers" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  return { tiers, rows, loading, reload: load };
}