import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Gift, User as UserIcon, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { CertificateTier } from "@/lib/certificateTiers";

interface Props {
  tier: CertificateTier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserHit {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
}

export function PurchaseCertificateDialog({ tier, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"self" | "gift">("self");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Gift recipient search
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [recipient, setRecipient] = useState<UserHit | null>(null);

  const reset = () => {
    setMode("self");
    setNote("");
    setSearch("");
    setResults([]);
    setRecipient(null);
  };

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase.rpc("get_users_for_admin");
    const ql = q.toLowerCase();
    const hits = (data || [])
      .filter((u: any) =>
        u.id !== user?.id &&
        ((u.full_name || "").toLowerCase().includes(ql) ||
          (u.phone_number || "").toLowerCase().includes(ql))
      )
      .slice(0, 8)
      .map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        phone_number: u.phone_number,
      }));
    setResults(hits);
    setSearching(false);
  };

  const submit = async () => {
    if (!user || !tier) return;
    if (mode === "gift" && !recipient) {
      toast.error("Оберіть отримувача подарунка");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("certificate_purchase_requests").insert({
      buyer_id: user.id,
      recipient_id: mode === "gift" ? recipient!.id : null,
      recipient_phone: mode === "gift" ? recipient!.phone_number : null,
      is_gift: mode === "gift",
      tier: tier.id,
      amount_uah: tier.price,
      discount_percent: tier.discount,
      buyer_note: note.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Не вдалося створити заявку: " + error.message);
      return;
    }

    toast.success("Заявку створено! Адміністратор звʼяжеться з вами для оплати.");
    reset();
    onOpenChange(false);
    navigate("/sertyfikaty/moi");
  };

  if (!tier) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Купівля сертифіката <Badge variant="secondary">{tier.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            {tier.price}₴ — знижка {tier.discount}% на послуги фахівців
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "self" | "gift")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="self"><UserIcon className="h-4 w-4 mr-1.5" /> Для себе</TabsTrigger>
            <TabsTrigger value="gift"><Gift className="h-4 w-4 mr-1.5" /> В подарунок</TabsTrigger>
          </TabsList>

          <TabsContent value="self" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Сертифікат буде активовано на вашому профілі після підтвердження оплати адміністратором.
            </p>
          </TabsContent>

          <TabsContent value="gift" className="space-y-3 mt-4">
            <div>
              <Label className="mb-1.5 block">Отримувач подарунка</Label>
              {recipient ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={recipient.avatar_url || undefined} />
                    <AvatarFallback>{(recipient.full_name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{recipient.full_name || "Без імені"}</p>
                    <p className="text-xs text-muted-foreground truncate">{recipient.phone_number || "—"}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setRecipient(null)}>Змінити</Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Імʼя або телефон..."
                      value={search}
                      onChange={(e) => doSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {searching && <p className="text-xs text-muted-foreground mt-2">Пошук...</p>}
                  {results.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-56 overflow-y-auto">
                      {results.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setRecipient(u)}
                          className="flex items-center gap-3 w-full p-2.5 hover:bg-muted text-left transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>{(u.full_name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name || "Без імені"}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.phone_number || "—"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div>
          <Label htmlFor="note" className="mb-1.5 block">Коментар (опційно)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === "gift" ? "Привітання отримувачу або примітка для адміна..." : "Примітка для адміністратора..."}
            maxLength={300}
            rows={3}
          />
        </div>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
          💡 Після створення заявки адміністратор звʼяжеться з вами для оплати ({tier.price}₴). Сертифікат буде активовано після підтвердження.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Скасувати</Button>
          <Button onClick={submit} disabled={submitting || (mode === "gift" && !recipient)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Створити заявку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}