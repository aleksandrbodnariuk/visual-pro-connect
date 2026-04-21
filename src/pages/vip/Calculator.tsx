import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calculator, Crown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import { BudgetCalculator } from "@/components/vip/calculator/BudgetCalculator";
import { RoiCalculator } from "@/components/vip/calculator/RoiCalculator";
import { TaxCalculator } from "@/components/vip/calculator/TaxCalculator";

export default function VipCalculator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vip, loading } = useUserVip(user?.id);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб скористатись калькулятором VIP</p>
          <Button onClick={() => navigate("/auth")}>Увійти</Button>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!vip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-xl">
          <Card className="p-6 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 text-center">
            <Crown className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-bold text-lg mb-1">
              Калькулятор доступний лише для VIP
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Оформіть VIP-членство, щоб отримати доступ до розширених інструментів.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate("/vip/tools")}>
                До інструментів
              </Button>
              <Button onClick={() => navigate("/vip")}>Тарифи VIP</Button>
            </div>
          </Card>
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

        <section className="col-span-12 lg:col-span-9 space-y-5 pb-20 md:pb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/vip/tools")}
                aria-label="Назад до інструментів"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Calculator className="h-7 w-7 text-amber-500" /> Розширений калькулятор
              </h1>
            </div>
          </div>

          <Card className="p-4">
            <Tabs defaultValue="budget">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="budget">Бюджет проєкту</TabsTrigger>
                <TabsTrigger value="roi">ROI / маржа</TabsTrigger>
                <TabsTrigger value="tax">Податки</TabsTrigger>
              </TabsList>
              <TabsContent value="budget" className="mt-4">
                <BudgetCalculator />
              </TabsContent>
              <TabsContent value="roi" className="mt-4">
                <RoiCalculator />
              </TabsContent>
              <TabsContent value="tax" className="mt-4">
                <TaxCalculator />
              </TabsContent>
            </Tabs>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            Калькулятори орієнтовні. Для офіційного обліку зверніться до бухгалтера.
          </p>
        </section>
      </main>
    </div>
  );
}