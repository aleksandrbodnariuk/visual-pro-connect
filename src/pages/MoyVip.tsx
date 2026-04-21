import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Calendar, Sparkles, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import { useVipTiers } from "@/hooks/vip/useVipTiers";
import { getVipTier } from "@/lib/vipTiers";
import { VipBenefitsCard } from "@/components/vip/VipBenefitsCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RequestRow {
  id: string;
  tier: string;
  amount_uah: number;
  status: string;
  is_gift: boolean;
  recipient_id: string | null;
  created_at: string;
  admin_note: string | null;
}

export default function MoyVip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vip, loading } = useUserVip(user?.id);
  const { tiers } = useVipTiers(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [color, setColor] = useState("");
  const [savingColor, setSavingColor] = useState(false);

  const tier = vip ? getVipTier(vip.tier, tiers) : null;

  useEffect(() => {
    setColor(vip?.custom_name_color || tier?.name_color || "");
  }, [vip, tier]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("vip_purchase_requests" as any)
      .select("*")
      .or(`buyer_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setRequests((data || []) as unknown as RequestRow[]));
  }, [user?.id]);

  const saveColor = async () => {
    if (!user?.id || !vip) return;
    setSavingColor(true);
    const { error } = await supabase
      .from("user_vip_memberships" as any)
      .update({ custom_name_color: color || null })
      .eq("user_id", user.id);
    setSavingColor(false);
    if (error) toast.error("Не вдалося зберегти колір");
    else toast.success("Колір імені оновлено");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб побачити свій VIP-статус</p>
          <Button onClick={() => navigate("/auth")}>Увійти</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        <aside className="hidden lg:block col-span-3">
          <Sidebar className="sticky top-20" />
        </aside>
        <section className="col-span-12 lg:col-span-9 space-y-6 pb-20 md:pb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Crown className="h-7 w-7 text-amber-500" /> Мій VIP-статус
            </h1>
            <Button variant="outline" onClick={() => navigate("/vip")}>Тарифи</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : vip && tier ? (
            <>
              <Card className={cn("relative p-6 overflow-hidden text-white bg-gradient-to-br", tier.gradient)}>
                <div className={cn("absolute inset-0 pointer-events-none", `vip-anim-${tier.banner_animation}`)} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5" />
                    <span className="uppercase text-xs tracking-widest">Активний рівень</span>
                  </div>
                  <h2 className="text-3xl font-bold">{tier.label}</h2>
                  <p className="opacity-90 mt-1">{tier.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {vip.is_lifetime ? (
                      <Badge className="bg-white/20 border-0">Назавжди</Badge>
                    ) : vip.expires_at ? (
                      <Badge className="bg-white/20 border-0 gap-1">
                        <Calendar className="h-3 w-3" />
                        Діє до {format(new Date(vip.expires_at), "d MMMM yyyy", { locale: uk })}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-5 w-5 text-amber-500" />
                  <h3 className="font-bold">Кастомний колір імені</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Виберіть колір для свого імені на профілі (HEX, наприклад #f59e0b).
                </p>
                <div className="flex items-center gap-3 max-w-md">
                  <Input
                    type="color"
                    value={color || "#f59e0b"}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#f59e0b"
                    className="flex-1"
                  />
                  <Button onClick={saveColor} disabled={savingColor}>
                    {savingColor && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Зберегти
                  </Button>
                </div>
                {color && (
                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground">Перегляд:</Label>
                    <div className="text-2xl font-bold mt-1" style={{ color }}>
                      Ваше Ім'я
                    </div>
                  </div>
                )}
              </Card>

              <VipBenefitsCard userId={user.id} />
            </>
          ) : (
            <Card className="p-8 text-center">
              <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-xl font-bold mb-2">У вас ще немає VIP-статусу</h3>
              <p className="text-muted-foreground mb-4">Виберіть тариф, щоб виділитись на платформі.</p>
              <Button onClick={() => navigate("/vip")}>Переглянути тарифи</Button>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="font-bold mb-4">Історія заявок</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Заявок ще немає.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => {
                  const t = getVipTier(r.tier, tiers);
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{t?.label || r.tier}</span>
                          <Badge variant="outline" className="text-xs">{r.amount_uah}₴</Badge>
                          {r.is_gift && <Badge variant="secondary" className="text-xs">🎁 Подарунок</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(r.created_at), "d MMM yyyy, HH:mm", { locale: uk })}
                          {r.admin_note ? ` • ${r.admin_note}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={r.status === "approved" ? "default" : r.status === "pending" ? "secondary" : "destructive"}
                      >
                        {r.status === "approved" ? "Підтверджено" : r.status === "pending" ? "Очікує" : r.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}