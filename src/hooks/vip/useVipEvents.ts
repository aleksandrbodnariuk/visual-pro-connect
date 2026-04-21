import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VipEventType =
  | "general"
  | "shoot"
  | "meeting"
  | "deadline"
  | "trip"
  | "personal";

export type VipEventStatus = "planned" | "done" | "cancelled";

export type VipEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: VipEventType;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  color: string;
  status: VipEventStatus;
  linked_order_id: string | null;
  created_at: string;
  updated_at: string;
};

export type VipEventInput = {
  title: string;
  description?: string | null;
  event_type?: VipEventType;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  color?: string;
  status?: VipEventStatus;
};

export function useVipEvents(userId: string | undefined) {
  const [events, setEvents] = useState<VipEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("vip_events" as any)
      .select("*")
      .eq("user_id", userId)
      .order("starts_at", { ascending: true });
    if (!error && data) setEvents(data as unknown as VipEvent[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (input: VipEventInput) => {
    if (!userId) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("vip_events" as any).insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      event_type: input.event_type ?? "general",
      starts_at: input.starts_at,
      ends_at: input.ends_at ?? null,
      location: input.location ?? null,
      color: input.color ?? "amber",
      status: input.status ?? "planned",
    });
    if (!error) await fetchEvents();
    return { error };
  };

  const updateEvent = async (id: string, patch: Partial<VipEvent>) => {
    const { error } = await supabase
      .from("vip_events" as any)
      .update(patch as any)
      .eq("id", id);
    if (!error) await fetchEvents();
    return { error };
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("vip_events" as any).delete().eq("id", id);
    if (!error) await fetchEvents();
    return { error };
  };

  return { events, loading, refetch: fetchEvents, createEvent, updateEvent, deleteEvent };
}