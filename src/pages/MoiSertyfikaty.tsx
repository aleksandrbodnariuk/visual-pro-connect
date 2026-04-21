import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Clock, CheckCircle2, XCircle, Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { getTier } from "@/lib/certificateTiers";
import { useUserCertificate } from "@/hooks/certificates/useUserCertificate";
import { CertificateBadge } from "@/components/certificates/CertificateBadge";
import { useVipBenefits } from "@/hooks/vip/useVipBenefits";
import { Crown, Percent } from "lucide-react";
import { toast } from "sonner";

interface PurchaseRequest {
  id: string;
  buyer_id: string;
  recipient_id: string | null;
  is_gift: boolean;
  tier: string;
  amount_uah: number;
  discount_percent: number; // legacy field, ignored
  status: "pending" | "approved" | "rejected" | "cancelled";
  buyer_note: string | null;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
}

const STATUS: Record<PurchaseRequest["status"], { label: string; color: string; icon: any }> = {
  pending: { label: "Очікує оплати", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  approved: { label: "Активовано", color: "bg-green-500/15 text-green-600 border-green-500/30", icon: CheckCircle2 },
  rejected: { label: "Відхилено", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
  cancelled: { label: "Скасовано", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

export default function MoiSertyfikaty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { certificate } = useUserCertificate(user?.id);
  const vipBenefits = useVipBenefits(user?.id);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("certificate_purchase_requests")
      .select("*")
      .or(`buyer_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (error) toast.error("Не вдалося завантажити заявки");
    else setRequests((data || []) as PurchaseRequest[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const cancelRequest = async (id: string) => {
    const { error } = await supabase
      .from("certificate_purchase_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) toast.error("Не вдалося скасувати");
    else { toast.success("Заявку скасовано"); load(); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/auth")}>Увійти</Button>
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
            <h1 className="text-2xl md:text-3xl font-bold">Мої сертифікати</h1>
            <Button onClick={() => navigate("/sertyfikaty")}>
              <Award className="h-4 w-4 mr-2" /> Купити сертифікат
            </Button>
          </div>

          {/* Active certificate */}
          {certificate && (
            <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Активний сертифікат
                  </CardTitle>
                  <CertificateBadge userId={user.id} certificate={certificate} size="lg" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{certificate.note}</p>
              </CardContent>
            </Card>
          )}

          {/* VIP discount notice (cumulative with certificate) */}
          {vipBenefits.hasVip && vipBenefits.discountPercent > 0 && (
            <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-yellow-500/5">
              <CardContent className="pt-6 flex items-center gap-3 flex-wrap">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Crown className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-bold flex items-center gap-2 flex-wrap">
                    Активна VIP-знижка <Badge className="bg-amber-500 text-amber-950 border-0 gap-1"><Percent className="h-3 w-3" />{vipBenefits.discountPercent}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {certificate
                      ? `Сумується з вашим сертифікатом (${certificate.discount_value}${certificate.discount_type === "percent" ? "%" : "₴"}).`
                      : "Знижка застосовується автоматично до послуг наших фахівців."}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/vip/moi")}>
                  Мій VIP
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Історія заявок</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">У вас ще немає заявок на сертифікати.</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => {
                    const s = STATUS[r.status];
                    const StatusIcon = s.icon;
                    const tier = getTier(r.tier);
                    const isReceiver = r.recipient_id === user.id;
                    return (
                      <div key={r.id} className="rounded-lg border bg-card p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="font-semibold">{tier?.label || r.tier}</Badge>
                              <span className="font-bold">{r.amount_uah}₴</span>
                              <span className="text-sm text-muted-foreground">→ знижка {r.amount_uah}₴ на послуги</span>
                              {r.is_gift && (
                                <Badge variant="outline" className="gap-1">
                                  <Gift className="h-3 w-3" />
                                  {isReceiver ? "Подарунок вам" : "Подарунок"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(r.created_at), "d MMMM yyyy, HH:mm", { locale: uk })}
                            </p>
                            {r.buyer_note && <p className="text-sm">📝 {r.buyer_note}</p>}
                            {r.admin_note && (
                              <p className="text-sm text-muted-foreground">💬 Адмін: {r.admin_note}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className={s.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {s.label}
                            </Badge>
                            {r.status === "pending" && r.buyer_id === user.id && (
                              <Button size="sm" variant="ghost" onClick={() => cancelRequest(r.id)}>
                                Скасувати
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}