import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { toast } from "sonner";

interface Poll {
  id: string;
  question: string;
  allow_multiple: boolean;
  is_anonymous: boolean;
  created_by: string;
}
interface PollOption { id: string; text: string; position: number }
interface PollVote { id: string; option_id: string; user_id: string }

interface PostPollProps {
  pollId: string;
  currentUserId: string | null;
}

export function PostPoll({ pollId, currentUserId }: PostPollProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [voterNames, setVoterNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: p }, { data: opts }, { data: vs }] = await Promise.all([
      supabase.from("polls").select("id,question,allow_multiple,is_anonymous,created_by").eq("id", pollId).maybeSingle(),
      supabase.from("poll_options").select("id,text,position").eq("poll_id", pollId).order("position"),
      supabase.from("poll_votes").select("id,option_id,user_id").eq("poll_id", pollId),
    ]);
    setPoll(p as any);
    setOptions((opts as any) || []);
    setVotes((vs as any) || []);
    if (p && !(p as any).is_anonymous && vs && vs.length) {
      const ids = Array.from(new Set((vs as any[]).map(v => v.user_id)));
      const { data: users } = await supabase.from("users").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (users || []).forEach((u: any) => { map[u.id] = u.full_name || "Користувач"; });
      setVoterNames(map);
    }
    setLoading(false);
  }, [pollId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`post-poll-${pollId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${pollId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pollId, load]);

  const uniqueVoters = new Set(votes.map(v => v.user_id)).size;
  const myVotes = currentUserId ? votes.filter(v => v.user_id === currentUserId) : [];
  const isMyOption = (id: string) => myVotes.some(v => v.option_id === id);

  const handleVote = async (optionId: string) => {
    if (!currentUserId || !poll || busy) return;
    setBusy(true);
    try {
      const existing = myVotes.find(v => v.option_id === optionId);
      if (existing) {
        const { error } = await supabase.from("poll_votes").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        if (!poll.allow_multiple && myVotes.length > 0) {
          const { error: delErr } = await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", currentUserId);
          if (delErr) throw delErr;
        }
        const { error } = await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, user_id: currentUserId });
        if (error) throw error;
      }
      await load();
    } catch (e: any) {
      console.error("[PostPoll vote]", e);
      toast.error("Не вдалося проголосувати");
    } finally { setBusy(false); }
  };

  if (loading) return <div className="text-xs text-muted-foreground p-3">Завантаження опитування…</div>;
  if (!poll) return <div className="text-xs text-muted-foreground p-3">Опитування недоступне</div>;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="font-medium text-sm leading-snug">{poll.question}</div>
      <div className="text-[11px] flex items-center gap-1 text-muted-foreground">
        <Check className="w-3 h-3" />
        {poll.allow_multiple ? "Виберіть один або кілька варіантів" : "Виберіть одну відповідь"}
        {poll.is_anonymous && <span>· Анонімно</span>}
      </div>
      <div className="space-y-2 pt-1">
        {options.map(opt => {
          const count = votes.filter(v => v.option_id === opt.id).length;
          const pct = uniqueVoters > 0 ? Math.round((count / Math.max(uniqueVoters, 1)) * 100) : 0;
          const mine = isMyOption(opt.id);
          return (
            <button key={opt.id} type="button" onClick={() => handleVote(opt.id)} disabled={busy || !currentUserId}
              className={cn("w-full text-left rounded-lg p-2 transition-colors border bg-background hover:bg-accent",
                mine && "border-primary")}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className={cn("inline-flex items-center justify-center w-4 h-4 border flex-shrink-0",
                    poll.allow_multiple ? "rounded-sm" : "rounded-full",
                    mine ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50")}>
                    {mine && <Check className="w-3 h-3" />}
                  </span>
                  <span className="truncate">{opt.text}</span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              </div>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden bg-muted">
                <div className="h-full transition-all bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[11px] mt-0.5 text-muted-foreground">{pct}%</div>
              {!poll.is_anonymous && count > 0 && (
                <div className="text-[11px] mt-0.5 truncate text-muted-foreground">
                  {votes.filter(v => v.option_id === opt.id).map(v => voterNames[v.user_id] || "…").join(", ")}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] pt-1 text-muted-foreground">
        {uniqueVoters} {pluralVoters(uniqueVoters)}
      </div>
    </div>
  );
}

function pluralVoters(n: number): string {
  const mod10 = n % 10; const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "голос";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "голоси";
  return "голосів";
}