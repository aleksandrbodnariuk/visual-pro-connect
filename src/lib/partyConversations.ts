import { supabase } from "@/integrations/supabase/client";

/** Conversation ids that belong to party chats; these live only in the party section. */
export async function fetchPartyConversationIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data } = await supabase.from("party_chats").select("conversation_id").in("conversation_id", ids);
  return new Set((data || []).map((r: any) => r.conversation_id).filter(Boolean));
}
