import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crown, Search, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useVipTiers } from "@/hooks/vip/useVipTiers";

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
}

interface MembershipRow {
  user_id: string;
  tier: string;
  expires_at: string | null;
  is_lifetime: boolean;
}

export function VipManualGrant() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [memberships, setMemberships] = useState<Record<string, MembershipRow>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { tier: string; days: string; lifetime: boolean }>>({});
  const { tiers } = useVipTiers(false);

  const load = async () => {
    setLoading(true);
    const [{ data: usersData }, { data: memsData }] = await Promise.all([
      supabase.rpc("get_users_for_admin"),
      supabase.from("user_vip_memberships" as any).select("user_id, tier, expires_at, is_lifetime"),
    ]);
    const map: Record<string, MembershipRow> = {};
    (memsData || []).forEach((m: any) => { map[m.user_id] = m as MembershipRow; });
    setMemberships(map);
    setUsers((usersData || []) as UserRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const draft = (uid: string) => drafts[uid] || { tier: tiers[0]?.id || "gold", days: "30", lifetime: false };
  const setDraft = (uid: string, patch: Partial<{ tier: string; days: string; lifetime: boolean }>) =>
    setDrafts((p) => ({ ...p, [uid]: { ...draft(uid), ...patch } }));

  const grant = async (uid: string) => {
    const d = draft(uid);
    setGranting(uid);
    const expires = d.lifetime ? null : new Date(Date.now() + (parseInt(d.days) || 30) * 86400000).toISOString();
    const { error } = await supabase.from("user_vip_memberships" as any).upsert({
      user_id: uid,
      tier: d.tier,
      started_at: new Date().toISOString(),
      expires_at: expires,
      is_lifetime: d.lifetime,
    }, { onConflict: "user_id" });
    setGranting(null);
    if (error) toast.error("Помилка: " + error.message);
    else {
      toast.success("VIP видано");
      // notify
      await supabase.from("notifications").insert({
        user_id: uid,
        message: `🏆 Адміністратор видав вам ${tiers.find(t => t.id === d.tier)?.label || d.tier}`,
        link: "/vip/moi",
      });
      load();
    }
  };

  const revoke = async (uid: string) => {
    if (!confirm("Скасувати VIP цього користувача?")) return;
    setGranting(uid);
    const { error } = await supabase.from("user_vip_memberships" as any).delete().eq("user_id", uid);
    setGranting(null);
    if (error) toast.error("Помилка");
    else { toast.success("VIP скасовано"); load(); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.full_name || "").toLowerCase().includes(q) || (u.phone_number || "").includes(q));
  }, [users, search]);

  const activeCount = Object.values(memberships).filter((m) => m.is_lifetime || (m.expires_at && new Date(m.expires_at) > new Date())).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Видача VIP вручну
            </CardTitle>
            <CardDescription>Видайте або скасуйте VIP-статус будь-якого користувача.</CardDescription>
          </div>
          <Badge variant="secondary">Активних: {activeCount}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Пошук..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((u) => {
              const m = memberships[u.id];
              const isActive = m && (m.is_lifetime || (m.expires_at && new Date(m.expires_at) > new Date()));
              const d = draft(u.id);
              const initials = (u.full_name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 min-w-0 md:w-56">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "Без імені"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.phone_number || "—"}</p>
                    </div>
                  </div>
                  {isActive && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
                      <Crown className="h-3 w-3" /> {tiers.find(t => t.id === m.tier)?.label || m.tier}
                      {m.is_lifetime ? " • назавжди" : m.expires_at ? ` • до ${new Date(m.expires_at).toLocaleDateString("uk")}` : ""}
                    </Badge>
                  )}
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <Select value={d.tier} onValueChange={(v) => setDraft(u.id, { tier: v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {tiers.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Switch id={`life-${u.id}`} checked={d.lifetime} onCheckedChange={(v) => setDraft(u.id, { lifetime: v })} />
                      <Label htmlFor={`life-${u.id}`} className="text-xs">∞</Label>
                    </div>
                    {!d.lifetime && (
                      <Input type="number" min="1" value={d.days} className="w-20"
                        onChange={(e) => setDraft(u.id, { days: e.target.value })} placeholder="днів" />
                    )}
                    <Button size="sm" onClick={() => grant(u.id)} disabled={granting === u.id}>
                      {granting === u.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      {isActive ? "Оновити" : "Видати"}
                    </Button>
                    {isActive && (
                      <Button size="icon" variant="ghost" onClick={() => revoke(u.id)} disabled={granting === u.id}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}