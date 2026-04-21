import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_CERTIFICATE_TIERS, type CertificateTier } from "@/lib/certificateTiers";

export interface CertificateTierRow {
  id: string;
  label: string;
  price_uah: number;
  description: string;
  perks: string[];
  gradient: string;
  sort_order: number;
  is_active: boolean;
  highlight: boolean;
}

const rowToTier = (r: CertificateTierRow): CertificateTier => ({
  id: r.id,
  label: r.label,
  price: Number(r.price_uah),
  description: r.description,
  perks: Array.isArray(r.perks) ? r.perks : [],
  gradient: r.gradient,
  highlight: r.highlight,
});

/**
 * Loads certificate tiers from the database with realtime updates.
 * Falls back to hardcoded tiers if the request fails or returns nothing.
 *
 * @param activeOnly when true (default) returns only active tiers, sorted.
 */
export function useCertificateTiers(activeOnly = true) {
  const [tiers, setTiers] = useState<CertificateTier[]>(FALLBACK_CERTIFICATE_TIERS);
  const [rows, setRows] = useState<CertificateTierRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase
      .from("certificate_tiers" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error || !data || data.length === 0) {
      setTiers(FALLBACK_CERTIFICATE_TIERS);
      setRows([]);
    } else {
      const list = data as unknown as CertificateTierRow[];
      setRows(list);
      setTiers(list.map(rowToTier));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("cert-tiers-" + (activeOnly ? "active" : "all"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "certificate_tiers" },
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
