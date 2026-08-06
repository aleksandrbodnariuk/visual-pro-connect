import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientEventRow, ClientProfileRow, UpcomingGreeting } from "./clientTypes";

export interface ClientWithUser extends ClientProfileRow {
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  events: ClientEventRow[];
}

export function useClients() {
  const [clients, setClients] = useState<ClientWithUser[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingGreeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: profiles, error: pErr }, { data: events }, { data: up }] = await Promise.all([
        supabase.from("client_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("client_events").select("*").order("event_date", { ascending: true }),
        supabase.rpc("get_upcoming_client_greetings", { _days: 90 }),
      ]);

      if (pErr) throw pErr;

      const ids = (profiles || []).map((p: any) => p.user_id);
      let usersMap: Record<string, any> = {};
      if (ids.length) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, avatar_url, phone_number")
          .in("id", ids);
        usersMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
      }

      setClients(
        (profiles || []).map((p: any) => ({
          ...p,
          full_name: usersMap[p.user_id]?.full_name ?? null,
          avatar_url: usersMap[p.user_id]?.avatar_url ?? null,
          phone_number: usersMap[p.user_id]?.phone_number ?? null,
          events: (events || []).filter((e: any) => e.client_user_id === p.user_id),
        }))
      );
      setUpcoming((up as unknown as UpcomingGreeting[]) || []);
    } catch (e) {
      console.error("Помилка завантаження клієнтів:", e);
      toast.error("Не вдалося завантажити клієнтів");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { clients, upcoming, isLoading, reload: load };
}