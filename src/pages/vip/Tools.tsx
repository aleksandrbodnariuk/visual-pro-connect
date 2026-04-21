import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Crown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";

const TOOLS = [
  {
    id: "notebook",
    title: "Приватний нотатник",
    description:
      "Особисті нотатки з тегами, кольорами та закріпленням. Доступні лише вам, поки активний VIP-статус.",
    icon: BookOpen,
    path: "/vip/notebook",
    available: true,
  },
];

export default function VipTools() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vip, loading } = useUserVip(user?.id);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб побачити інструменти VIP</p>
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        <aside className="hidden lg:block col-span-3">
          <Sidebar className="sticky top-20" />
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-5 pb-20 md:pb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-amber-500" /> VIP-інструменти
            </h1>
            <Button variant="outline" onClick={() => navigate("/vip/moi")}>Мій VIP</Button>
          </div>

          {!vip && (
            <Card className="p-6 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 flex items-center gap-4 flex-wrap">
              <Crown className="h-10 w-10 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">Інструменти доступні лише VIP-користувачам</h3>
                <p className="text-sm text-muted-foreground">
                  Оформіть VIP-членство, щоб розблокувати приватний нотатник та інші ексклюзивні можливості.
                </p>
              </div>
              <Button onClick={() => navigate("/vip")}>Тарифи VIP</Button>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const locked = !vip;
              return (
                <Card
                  key={tool.id}
                  className="p-6 hover:shadow-md transition-shadow flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-lg">{tool.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">{tool.description}</p>
                  <Button
                    onClick={() => navigate(tool.path)}
                    disabled={locked}
                    variant={locked ? "outline" : "default"}
                    className="w-full"
                  >
                    {locked ? "Потрібен VIP" : "Відкрити"}
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}