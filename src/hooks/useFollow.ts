import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Facebook-style follow: one-way subscription with live counters.
export function useFollow(profileId?: string) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const db = supabase as any;

  const load = useCallback(async () => {
    if (!profileId) return;
    const [followers, following, mine] = await Promise.all([
      db.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", profileId),
      db.from("user_follows").select("id", { count: "exact", head: true }).eq("follower_id", profileId),
      user && user.id !== profileId
        ? db.from("user_follows").select("id").eq("follower_id", user.id).eq("following_id", profileId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setFollowersCount(followers.count ?? 0);
    setFollowingCount(following.count ?? 0);
    setIsFollowing(!!mine.data);
  }, [profileId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async () => {
    if (!user) { navigate("/auth"); return; }
    if (!profileId || user.id === profileId || busy) return;
    setBusy(true);
    const was = isFollowing;
    setIsFollowing(!was);
    setFollowersCount((c) => Math.max(0, c + (was ? -1 : 1)));
    const { error } = was
      ? await db.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", profileId)
      : await db.from("user_follows").insert({ follower_id: user.id, following_id: profileId });
    if (error && error.code !== "23505") {
      setIsFollowing(was);
      setFollowersCount((c) => Math.max(0, c + (was ? 1 : -1)));
      toast.error("Не вдалося змінити підписку. Спробуйте ще раз.");
    } else {
      toast.success(was ? "Ви відписалися" : "Ви підписалися");
    }
    setBusy(false);
  }, [user, profileId, isFollowing, busy, navigate]);

  return { isFollowing, followersCount, followingCount, toggle, busy };
}
