import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Sparkles,
  Crown,
  Loader2,
  Calculator,
  BellRing,
  CalendarRange,
  LineChart,
  Lightbulb,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2 } from "lucide-react";

type Tool = {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  path: string;
  available: boolean;
};

const TOOLS: Tool[] = [
  {
    id: "notebook",
    title: "Приватний нотатник",
    description:
      "Особисті нотатки з тегами, кольорами та закріпленням. Доступні лише вам, поки активний VIP-статус.",
    icon: BookOpen,
    path: "/vip/notebook",
    available: true,
  },
  {
    id: "calculator",
    title: "Розширений калькулятор",
    description:
      "Бюджет проєкту, маржа та ROI, податки й комісії — швидкі розрахунки для зйомок та послуг.",
    icon: Calculator,
    path: "/vip/calculator",
    available: true,
  },
  {
    id: "reminders",
    title: "Нагадування + push",
    description:
      "Особисті нагадування з датою/часом і автоматичні push-сповіщення.",
    icon: BellRing,
    path: "/vip/reminders",
    available: true,
  },
  {
    id: "planner",
    title: "Планувальник подій",
    description:
      "Календар подій із типами (зйомки, зустрічі, дедлайни) та швидким переглядом по днях.",
    icon: CalendarRange,
    path: "/vip/planner",
    available: true,
  },
  {
    id: "analytics",
    title: "Особиста аналітика витрат",
    description:
      "Графіки витрат на послуги фахівців з фільтрами по періодах і категоріях.",
    icon: LineChart,
    path: "/vip/analytics",
    available: true,
  },
  {
    id: "editor",
    title: "Текстовий редактор B&C",
    description:
      "Офісний редактор документів: шрифти, кольори, стилі, відкриття файлів Word (.docx), збереження на сайті та на комп'ютері.",
    icon: FileText,
    path: "/vip/editor",
    available: true,
  },
  {
    id: "moodboard",
    title: "Mood board",
    description:
      "Колекції зображень-ідей для майбутніх зйомок із тегами та папками. Незабаром.",
    icon: Lightbulb,
    path: "/vip/moodboard",
    available: false,
  },
];

export default function VipTools() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vip, loading } = useUserVip(user?.id);
  const storageKey = `vip_hidden_tools_${user?.id ?? "anon"}`;
  const [hidden, setHidden] = useState<string[]>([]);
  const [customize, setCustomize] = useState(false);
  useEffect(() => {
    try { setHidden(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { setHidden([]); }
  }, [storageKey]);
  const toggleTool = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHidden(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

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
            <div className="flex gap-2">
              <Button variant={customize ? "default" : "outline"} onClick={() => setCustomize((c) => !c)}>
                <Settings2 className="h-4 w-4 mr-1" /> {customize ? "Готово" : "Налаштувати"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/vip/moi")}>Мій VIP</Button>
            </div>
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

          {customize && (
            <Card className="p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Позначте інструменти, які показувати в розділі VIP:</p>
              {TOOLS.map((t) => (
                <label key={t.id} className="flex items-center gap-3 min-h-11 cursor-pointer">
                  <Checkbox checked={!hidden.includes(t.id)} onCheckedChange={() => toggleTool(t.id)} />
                  <span>{t.title}</span>
                </label>
              ))}
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.filter((t) => !hidden.includes(t.id)).map((tool) => {
              const Icon = tool.icon;
              const lockedByVip = !vip;
              const comingSoon = !tool.available;
              const disabled = lockedByVip || comingSoon;
              return (
                <Card
                  key={tool.id}
                  className="p-6 hover:shadow-md transition-shadow flex flex-col gap-3 relative"
                >
                  {comingSoon && (
                    <Badge
                      variant="outline"
                      className="absolute top-3 right-3 text-[10px] uppercase tracking-wider"
                    >
                      Незабаром
                    </Badge>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-lg">{tool.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">{tool.description}</p>
                  <Button
                    onClick={() => navigate(tool.path)}
                    disabled={disabled}
                    variant={disabled ? "outline" : "default"}
                    className="w-full"
                  >
                    {lockedByVip ? "Потрібен VIP" : comingSoon ? "Незабаром" : "Відкрити"}
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