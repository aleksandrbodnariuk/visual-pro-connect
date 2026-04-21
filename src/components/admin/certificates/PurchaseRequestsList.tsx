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
import { getTier } from "@/lib/certificateTiers";

interface RequestRow {
  id: string;
  buyer_id: string;
  recipient_id: string | null;
  recipient_phone: string | null;
  is_gift: boolean;
  tier: string;
  amount_uah: number;
  discount_percent: number;
  status: string;
  buyer_note: string | null;
  admin_note: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
}

interface Props {
  onApproved?: () => void;
}

export function PurchaseRequestsList({ onApproved }: Props) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [users, setUsers] = useState<Record<string, UserRow>>({});
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: reqData }, { data: usersData }] = await Promise.all([
      supabase
        .from("certificate_purchase_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.rpc("get_users_for_admin"),
    ]);

    setRequests((reqData || []) as RequestRow[]);
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
      .channel("admin-cert-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "certificate_purchase_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const approve = async (id: string) => {
    setActioning(id);
    const { error } = await supabase.rpc("approve_certificate_purchase", { _request_id: id });
    setActioning(null);
    if (error) toast.error("Не вдалося підтвердити: " + error.message);
    else {
      toast.success("Сертифікат активовано! Користувач отримав сповіщення.");
      onApproved?.();
      load();
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    setActioning(rejectId);
    const { error } = await supabase.rpc("reject_certificate_purchase", {
      _request_id: rejectId,
      _admin_note: rejectNote.trim() || null,
    });
    setActioning(null);
    setRejectId(null);
    setRejectNote("");
    if (error) toast.error("Не вдалося відхилити");
    else { toast.success("Заявку відхилено"); load(); }
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
              <Inbox className="h-5 w-5 text-amber-500" />
              Заявки на купівлю
            </CardTitle>
            <CardDescription>
              Підтвердіть заявку після отримання оплати — сертифікат активується автоматично.
            </CardDescription>
          </div>
          <Badge variant={requests.length > 0 ? "default" : "secondary"} className="shrink-0">
            <Clock className="h-3 w-3 mr-1" /> {requests.length}
          </Badge>
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
              const tier = getTier(r.tier);
              return (
                <div key={r.id} className="rounded-lg border p-4 bg-card">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    {/* Buyer */}
                    <div className="col-span-12 md:col-span-3">
                      <p className="text-[11px] uppercase text-muted-foreground mb-1">Покупець</p>
                      {renderUser(r.buyer_id)}
                    </div>

                    {/* Recipient (if gift) */}
                    <div className="col-span-12 md:col-span-3">
                      <p className="text-[11px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
                        {r.is_gift && <Gift className="h-3 w-3" />} Отримувач
                      </p>
                      {r.is_gift ? renderUser(r.recipient_id) : <span className="text-sm text-muted-foreground">Для себе</span>}
                    </div>

                    {/* Tier + amount */}
                    <div className="col-span-12 md:col-span-3">
                      <p className="text-[11px] uppercase text-muted-foreground mb-1">Тариф</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{tier?.label || r.tier}</Badge>
                        <span className="font-bold">{r.amount_uah}₴</span>
                        <span className="text-xs text-muted-foreground">→ {r.discount_percent}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(new Date(r.created_at), "d MMM yyyy, HH:mm", { locale: uk })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="col-span-12 md:col-span-3 flex md:justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => approve(r.id)}
                        disabled={actioning === r.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actioning === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Підтвердити
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectId(r.id)}
                        disabled={actioning === r.id}
                      >
                        <X className="h-4 w-4 mr-1" /> Відхилити
                      </Button>
                    </div>

                    {r.buyer_note && (
                      <div className="col-span-12 text-sm bg-muted/40 rounded p-2">
                        📝 <span className="text-muted-foreground">Коментар покупця:</span> {r.buyer_note}
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
          <DialogHeader>
            <DialogTitle>Відхилити заявку</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Причина відхилення (буде показана покупцю)..."
            rows={3}
            maxLength={300}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={reject}>Відхилити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}