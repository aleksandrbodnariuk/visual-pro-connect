import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { FriendListMembership, normalizeListName } from "@/lib/friendLists";

export interface FriendListItem {
  id: string;
  name: string;
  sort_order: number;
}

export function useFriendLists() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [lists, setLists] = useState<FriendListItem[]>([]);
  const [memberships, setMemberships] = useState<FriendListMembership[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [l, m] = await Promise.all([
      supabase.from("friend_lists").select("id,name,sort_order").eq("owner_id", uid).order("sort_order").order("created_at"),
      supabase.from("friend_list_members").select("list_id,friend_id").eq("owner_id", uid),
    ]);
    if (l.data) setLists(l.data);
    if (m.data) setMemberships(m.data);
    setLoading(false);
  }, [uid]);

  useEffect(() => { refresh(); }, [refresh]);

  const createList = async (raw: string) => {
    if (!uid) return false;
    const name = normalizeListName(raw);
    if (!name) return false;
    if (lists.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Список з такою назвою вже існує");
      return false;
    }
    const { data, error } = await supabase
      .from("friend_lists")
      .insert({ owner_id: uid, name, sort_order: lists.length })
      .select("id,name,sort_order")
      .single();
    if (error || !data) { toast.error("Не вдалося створити список"); return false; }
    setLists((p) => [...p, data]);
    return true;
  };

  const renameList = async (id: string, raw: string) => {
    const name = normalizeListName(raw);
    if (!name) return false;
    if (lists.some((l) => l.id !== id && l.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Список з такою назвою вже існує");
      return false;
    }
    const { error } = await supabase.from("friend_lists").update({ name }).eq("id", id);
    if (error) { toast.error("Не вдалося перейменувати список"); return false; }
    setLists((p) => p.map((l) => (l.id === id ? { ...l, name } : l)));
    return true;
  };

  const deleteList = async (id: string) => {
    const { error } = await supabase.from("friend_lists").delete().eq("id", id);
    if (error) { toast.error("Не вдалося видалити список"); return false; }
    setLists((p) => p.filter((l) => l.id !== id));
    setMemberships((p) => p.filter((m) => m.list_id !== id));
    return true;
  };

  const toggleMember = async (listId: string, friendId: string) => {
    if (!uid) return;
    const has = memberships.some((m) => m.list_id === listId && m.friend_id === friendId);
    // optimistic
    setMemberships((p) =>
      has ? p.filter((m) => !(m.list_id === listId && m.friend_id === friendId)) : [...p, { list_id: listId, friend_id: friendId }],
    );
    const { error } = has
      ? await supabase.from("friend_list_members").delete().eq("list_id", listId).eq("friend_id", friendId)
      : await supabase.from("friend_list_members").insert({ list_id: listId, friend_id: friendId, owner_id: uid });
    if (error) {
      toast.error("Не вдалося оновити список");
      refresh();
    }
  };

  const listsOf = (friendId: string) => memberships.filter((m) => m.friend_id === friendId).map((m) => m.list_id);

  return { lists, memberships, loading, refresh, createList, renameList, deleteList, toggleMember, listsOf };
}
