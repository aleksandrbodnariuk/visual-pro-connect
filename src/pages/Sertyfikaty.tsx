import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Check, Sparkles, Gift } from "lucide-react";
import { CERTIFICATE_TIERS, type CertificateTier } from "@/lib/certificateTiers";
import { PurchaseCertificateDialog } from "@/components/certificates/PurchaseCertificateDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function Sertyfikaty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<CertificateTier | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const onBuy = (tier: CertificateTier) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSelectedTier(tier);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        <aside className="hidden lg:block col-span-3">
          <Sidebar className="sticky top-20" />
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-8 pb-20 md:pb-8">
          {/* Hero */}
          <div className="text-center space-y-3 py-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-medium">
              <Sparkles className="h-4 w-4" /> Економте на улюблених послугах
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Сертифікати знижок
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
              Купуйте сертифікати на знижку для послуг фото, відео та музика —
              для себе або в подарунок друзям. Без терміну дії.
            </p>
            <Button variant="outline" onClick={() => navigate("/sertyfikaty/moi")}>
              <Award className="h-4 w-4 mr-2" /> Мої сертифікати
            </Button>
          </div>

          {/* Tiers grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CERTIFICATE_TIERS.map((tier) => (
              <Card
                key={tier.id}
                className={cn(
                  "relative p-6 flex flex-col transition-all hover:shadow-xl hover:-translate-y-1",
                  tier.highlight && "ring-2 ring-amber-500 shadow-lg scale-[1.02]"
                )}
              >
                {tier.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 border-0 shadow-md">
                    🏆 Найпопулярніший
                  </Badge>
                )}

                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-md",
                    tier.gradient
                  )}
                >
                  <Award className="h-7 w-7 text-white drop-shadow" fill="currentColor" />
                </div>

                <h3 className="text-2xl font-bold">{tier.label}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{tier.description}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-xl text-muted-foreground">₴</span>
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400 font-semibold mb-6">
                  → знижка {tier.discount}% на послуги
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.perks.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => onBuy(tier)} className="w-full">
                    Купити
                  </Button>
                  <Button variant="outline" onClick={() => onBuy(tier)} className="w-full">
                    <Gift className="h-4 w-4 mr-1" /> В дар
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* How it works */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Як це працює</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { n: 1, t: "Оберіть тариф", d: "Виберіть рівень знижки, який вам підходить" },
                { n: 2, t: "Створіть заявку", d: "Адміністратор звʼяжеться для оплати зручним способом" },
                { n: 3, t: "Отримайте бейдж", d: "Сертифікат активується автоматично і видно публічно" },
              ].map((s) => (
                <div key={s.n} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-2">
                    {s.n}
                  </div>
                  <h3 className="font-semibold mb-1">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>

      <PurchaseCertificateDialog
        tier={selectedTier}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}