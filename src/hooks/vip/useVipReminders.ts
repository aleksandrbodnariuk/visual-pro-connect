import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VipReminder = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  remind_at: string;
  status: "active" | "done" | "cancelled";
  push_enabled: boolean;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useVipReminders(userId: string | undefined) {
  const [reminders, setReminders] = useState<VipReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!userId) {
      setReminders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("vip_reminders" as any)
      .select("*")
      .eq("user_id", userId)
      .order("remind_at", { ascending: true });
    if (!error && data) setReminders(data as unknown as VipReminder[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const createReminder = async (input: {
    title: string;
    description?: string;
    remind_at: string;
    push_enabled?: boolean;
  }) => {
    if (!userId) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("vip_reminders" as any).insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      remind_at: input.remind_at,
      push_enabled: input.push_enabled ?? true,
    });
    if (!error) await fetchReminders();
    return { error };
  };

  const updateReminder = async (id: string, patch: Partial<VipReminder>) => {
    const { error } = await supabase
      .from("vip_reminders" as any)
      .update(patch as any)
      .eq("id", id);
    if (!error) await fetchReminders();
    return { error };
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from("vip_reminders" as any).delete().eq("id", id);
    if (!error) await fetchReminders();
    return { error };
  };

  return { reminders, loading, refetch: fetchReminders, createReminder, updateReminder, deleteReminder };
}