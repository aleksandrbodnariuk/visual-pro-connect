import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VipNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function useVipNotes(userId: string | null | undefined) {
  const [notes, setNotes] = useState<VipNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("vip_notes" as any)
      .select("*")
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("Failed to load notes:", error);
      setNotes([]);
    } else {
      setNotes((data || []) as unknown as VipNote[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const ch = supabase
      .channel(`vip-notes-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vip_notes", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, load]);

  return { notes, loading, reload: load };
}