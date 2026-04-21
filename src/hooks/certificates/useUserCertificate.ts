import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserCertificate {
  id: string;
  user_id: string;
  is_active: boolean;
  discount_type: "fixed" | "percent";
  discount_value: number;
  note: string | null;
}

/**
 * Fetches an active certificate for a single user.
 * Returns null if no active certificate exists.
 */
export function useUserCertificate(userId: string | undefined | null) {
  const [certificate, setCertificate] = useState<UserCertificate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setCertificate(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_certificates")
        .select("id, user_id, is_active, discount_type, discount_value, note")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Error loading user certificate:", error);
        setCertificate(null);
      } else {
        setCertificate(data as UserCertificate | null);
      }
      setLoading(false);
    };

    load();

    // Realtime subscription for instant badge updates
    const channel = supabase
      .channel(`user-certificate-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_certificates",
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { certificate, loading };
}