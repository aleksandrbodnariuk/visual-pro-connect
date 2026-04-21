import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserVipMembership {
  id: string;
  user_id: string;
  tier: string;
  started_at: string;
  expires_at: string | null;
  is_lifetime: boolean;
  custom_name_color: string | null;
  custom_banner_url: string | null;
}

/**
 * Fetches a user's active VIP membership (or null).
 * Realtime-aware.
 */
export function useUserVip(userId: string | null | undefined) {
  const [vip, setVip] = useState<UserVipMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) {
      setVip(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("user_vip_memberships" as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      setVip(null);
    } else {
      const row = data as unknown as UserVipMembership;
      const isActive =
        row.is_lifetime || (row.expires_at && new Date(row.expires_at) > new Date());
      setVip(isActive ? row : null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!userId) return;
    const ch = supabase
      .channel(`user-vip-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_vip_memberships",
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { vip, loading, reload: load };
}