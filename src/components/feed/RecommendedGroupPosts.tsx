import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { groupActions } from "@/hooks/groups/useGroups";
import { getPostExcerpt } from "@/lib/dailyPosts";

const MAX_RECOMMENDED = 3;

/** A few recent posts from public groups the user has not joined yet. */
export function RecommendedGroupPosts({ onJoined }: { onJoined?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["recommended-group-posts", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: mine } = await supabase.from("group_members").select("group_id").eq("user_id", user!.id);
      const joined = new Set((mine || []).map((m) => m.group_id));
      const { data: groups } = await supabase.from("groups").select("id, name, avatar_url, slug").eq("privacy", "public");
      const candidates = (groups || []).filter((g) => !joined.has(g.id));
      if (candidates.length === 0) return [];
      const { data: posts } = await supabase.from("posts").select("id, content, group_id, created_at")
        .in("group_id", candidates.map((g) => g.id))
        .order("created_at", { ascending: false }).limit(20);
      const seen = new Set<string>();
      const out: any[] = [];
      for (const p of posts || []) {
        if (seen.has(p.group_id!)) continue; // one post per group
        seen.add(p.group_id!);
        out.push({ ...p, group: candidates.find((g) => g.id === p.group_id) });
        if (out.length >= MAX_RECOMMENDED) break;
      }
      return out;
    },
  });

  if (!data.length) return null;

  const join = async (groupId: string) => {
    try {
      await groupActions.join(groupId, user!.id, "public");
      qc.invalidateQueries({ queryKey: ["recommended-group-posts"] });
      onJoined?.();
    } catch {
      /* toast handled in groupActions */
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Рекомендовано з відкритих груп
        </div>
        {data.map((p) => (
          <div key={p.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={p.group?.avatar_url || ""} />
              <AvatarFallback><Users className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{p.group?.name}</div>
              <Link to={`/post/${p.id}`} className="text-sm text-muted-foreground line-clamp-2 hover:underline">
                {getPostExcerpt(p.content)}
              </Link>
            </div>
            <Button size="sm" variant="outline" className="min-h-[44px] shrink-0" onClick={() => join(p.group_id)}>
              Приєднатися
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
