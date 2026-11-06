import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssistantSettings {
  assistant_name: string;
  greeting: string;
  knowledge_base: string;
  instructions: string;
  quick_questions: string;
  studio_url: string;
  model: string;
  is_active: boolean;
  monthly_credit_limit: number;
}

export function useAssistantSettings() {
  const q = useQuery({
    queryKey: ["ai-assistant-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ai_assistant_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as AssistantSettings | null;
    },
    staleTime: 60_000,
  });
  return { settings: q.data, isLoading: q.isLoading, refetch: q.refetch };
}
