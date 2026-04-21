import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Gift, Search, Crown, Check } from "lucide-react";
import type { VipTier } from "@/lib/vipTiers";

interface Props {
  tier: VipTier | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface UserOption {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

export function PurchaseVipDialog({ tier, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [isGift, setIsGift] = useState(false);
  const [recipient, setRecipient] = useState<UserOption | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsGift(false);
      setRecipient(null);
      setSearchQ("");
      setSearchResults([]);
      setNote("");
    }
  }, [open]);

  // Search users for gifting
  useEffect(() => {
    if (!isGift || !searchQ.trim() || searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("users")
        .select("id, full_name, phone_number, avatar_url")
        .or(`full_name.ilike.%${searchQ}%,phone_number.ilike.%${searchQ}%`)
        .neq("id", user?.id || "")
        .limit(8);
      setSearchResults((data || []) as UserOption[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, isGift, user?.id]);

  const submit = async () => {
    if (!tier || !user) return;
    if (isGift && !recipient) {
      toast.error("Оберіть отримувача подарунка");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("vip_purchase_requests" as any).insert({
      buyer_id: user.id,
      recipient_id: isGift ? recipient!.id : null,
      recipient_phone: isGift ? recipient!.phone_number : null,
      is_gift: isGift,
      tier: tier.id,
      amount_uah: tier.price_uah,
      duration_days: tier.duration_days,
      buyer_note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Не вдалося створити заявку: " + error.message);
      return;
    }
    toast.success(
      "Заявку створено! Адміністратор зв'яжеться для оплати.",
      { duration: 6000 }
    );
    onOpenChange(false);
  };

  if (!tier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" /> Купити {tier.label}
          </DialogTitle>
          <DialogDescription>
            {tier.price_uah}₴ за {tier.duration_days} днів VIP-статусу
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`rounded-lg p-4 bg-gradient-to-br ${tier.gradient} text-white`}>
            <div className="text-xs uppercase opacity-80">Тариф</div>
            <div className="text-xl font-bold">{tier.label}</div>
            <div className="text-2xl font-bold mt-1">
              {tier.price_uah}₴ <span className="text-sm opacity-80 font-normal">/ {tier.duration_days} днів</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {tier.perks.slice(0, 3).map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" /> {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-500" />
              <Label htmlFor="gift" className="cursor-pointer">У подарунок іншому користувачу</Label>
            </div>
            <Switch id="gift" checked={isGift} onCheckedChange={setIsGift} />
          </div>

          {isGift && (
            <div className="space-y-2">
              <Label>Отримувач</Label>
              {recipient ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={recipient.avatar_url || undefined} />
                      <AvatarFallback>{(recipient.full_name || "U").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{recipient.full_name || "Без імені"}</p>
                      <p className="text-xs text-muted-foreground truncate">{recipient.phone_number || "—"}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setRecipient(null)}>Змінити</Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Пошук за іменем або телефоном..."
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {searching ? (
                    <div className="text-center py-3"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
                  ) : searchResults.length > 0 ? (
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {searchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setRecipient(u)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left transition-colors"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{(u.full_name || "U").slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{u.full_name || "Без імені"}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.phone_number || "—"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQ.trim().length >= 2 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Нікого не знайдено</p>
                  ) : null}
                </>
              )}
            </div>
          )}

          <div>
            <Label className="mb-1 block">Коментар адміністратору (опц.)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Спосіб оплати, додаткові побажання..."
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
            💳 Після підтвердження заявки адміністратор зв'яжеться з вами для оплати. VIP активується одразу після підтвердження оплати.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Скасувати
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Створити заявку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}