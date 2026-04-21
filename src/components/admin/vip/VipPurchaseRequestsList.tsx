import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Inbox, Check, X, Gift, Clock } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { useVipTiers } from "@/hooks/vip/useVipTiers";

interface RequestRow {
  id: string;
  buyer_id: string;
  recipient_id: string | null;
  recipient_phone: string | null;
  is_gift: boolean;
  tier: string;
  amount_uah: number;
  duration_days: number;
  status: string;
  buyer_note: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
}

export function VipPurchaseRequestsList() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [users, setUsers] = useState<Record<string, UserRow>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const { tiers } = useVipTiers(false);

  const load = async () => {
    setLoading(true);
    const [{ data: reqs }, { data: usersData }] = await Promise.all([
      supabase.from("vip_purchase_requests" as any).select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.rpc("get_users_for_admin"),
    ]);
    setRequests((reqs || []) as unknown as RequestRow[]);
    const map: Record<string, UserRow> = {};
    (usersData || []).forEach((u: any) => {
      map[u.id] = { id: u.id, full_name: u.full_name, avatar_url: u.avatar_url, phone_number: u.phone_number };
    });
    setUsers(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-vip-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_purchase_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const approve = async (id: string) => {
    setActing(id);
    const { error } = await supabase.rpc("approve_vip_purchase" as any, { _request_id: id });
    setActing(null);
    if (error) toast.error("Не вдалося підтвердити: " + error.message);
    else { toast.success("VIP активовано! Користувач отримав сповіщення."); load(); }
  };

  const reject = async () => {
    if (!rejectId) return;
    setActing(rejectId);
    const { error } = await supabase
      .from("vip_purchase_requests" as any)
      .update({ status: "rejected", admin_note: rejectNote.trim() || null })
      .eq("id", rejectId);
    setActing(null);
    setRejectId(null);
    setRejectNote("");
    if (error) toast.error("Не вдалося відхилити");
    else { toast.success("Відхилено"); load(); }
  };

  const renderUser = (id: string | null) => {
    if (!id) return <span className="text-muted-foreground">—</span>;
    const u = users[id];
    if (!u) return <span className="text-xs text-muted-foreground">{id.slice(0, 8)}...</span>;
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-7 w-7">
          <AvatarImage src={u.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{(u.full_name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{u.full_name || "Без імені"}</p>
          <p className="text-[11px] text-muted-foreground truncate">{u.phone_number || "—"}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-amber-500" /> Заявки на VIP
            </CardTitle>
            <CardDescription>Підтвердіть заявку після отримання оплати — VIP активується автоматично.</CardDescription>
          </div>
          <Badge variant={requests.length > 0 ? "default" : "secondary"}><Clock className="h-3 w-3 mr-1" /> {requests.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Немає нових заявок 🎉</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const tier = tiers.find((t) => t.id === r.tier);
              return (
                <div key={r.id} className="rounded-lg border p-4 bg-card">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-12 md:col-span-3">
                      <p className="text-[11px] uppercase text-muted-foreground mb-1">Покупець</p>
                      {renderUser(r.buyer_id)}
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <p className="text-[11px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
                        {r.is_gift && <Gift className="h-3 w-3" />} Отримувач
                      </p>
                      {r.is_gift ? renderUser(r.recipient_id) : <span className="text-sm text-muted-foreground">Для себе</span>}
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <p className="text-[11px] uppercase text-muted-foreground mb-1">Тариф</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{tier?.label || r.tier}</Badge>
                        <span className="font-bold">{r.amount_uah}₴</span>
                        <span className="text-xs text-muted-foreground">{r.duration_days} днів</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(new Date(r.created_at), "d MMM yyyy, HH:mm", { locale: uk })}
                      </p>
                    </div>
                    <div className="col-span-12 md:col-span-3 flex md:justify-end gap-2">
                      <Button size="sm" onClick={() => approve(r.id)} disabled={acting === r.id} className="bg-green-600 hover:bg-green-700">
                        {acting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Підтвердити
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectId(r.id)} disabled={acting === r.id}>
                        <X className="h-4 w-4 mr-1" /> Відхилити
                      </Button>
                    </div>
                    {r.buyer_note && (
                      <div className="col-span-12 text-sm bg-muted/40 rounded p-2">
                        📝 <span className="text-muted-foreground">Коментар:</span> {r.buyer_note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Відхилити заявку</DialogTitle></DialogHeader>
          <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Причина відхилення..." rows={3} maxLength={300} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={reject}>Відхилити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}