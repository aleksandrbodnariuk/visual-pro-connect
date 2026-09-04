import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VipDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useVipDocuments(userId: string | null | undefined) {
  const [documents, setDocuments] = useState<VipDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("vip_documents" as any)
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("Failed to load documents:", error);
      setDocuments([]);
    } else {
      setDocuments((data || []) as unknown as VipDocument[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { documents, loading, reload: load };
}

export async function saveVipDocument(params: {
  id?: string | null;
  userId: string;
  title: string;
  content: string;
}): Promise<string | null> {
  const { id, userId, title, content } = params;
  if (id) {
    const { error } = await supabase
      .from("vip_documents" as any)
      .update({ title, content })
      .eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from("vip_documents" as any)
    .insert({ user_id: userId, title, content })
    .select("id")
    .single();
  if (error) throw error;
  return (data as any)?.id ?? null;
}

export async function deleteVipDocument(id: string) {
  const { error } = await supabase.from("vip_documents" as any).delete().eq("id", id);
  if (error) throw error;
}
