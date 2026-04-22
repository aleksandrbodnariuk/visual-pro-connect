import { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, startOfYear, subDays } from "date-fns";
import { uk } from "date-fns/locale";
import { ArrowLeft, Crown, LineChart as LineChartIcon, Loader2, Wallet, Receipt, PieChart as PieChartIcon, BriefcaseBusiness } from "lucide-react";
import { Pie, PieChart, Cell, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import { useVipExpenseAnalytics } from "@/hooks/vip/useVipExpenseAnalytics";
import type { OrderType } from "@/components/specialist/types";

type PeriodFilter = "30d" | "month" | "year" | "all";

const CATEGORY_LABELS: Record<OrderType, string> = {
  photo: "Фото",
  video: "Відео",
  music: "Музика",
  other: "Інше",
};

const CATEGORY_COLOR_VARS: Record<OrderType, string> = {
  photo: "hsl(var(--accent))",
  video: "hsl(var(--secondary))",
  music: "hsl(var(--primary))",
  other: "hsl(var(--muted-foreground))",
};

const chartConfig = {
  amount: { label: "Сума", color: "hsl(var(--primary))" },
  expenses: { label: "Витрати", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function VipAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vip, loading: vipLoading } = useUserVip(user?.id);
  const { orders, loading } = useVipExpenseAnalytics(user?.id);
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  const filteredOrders = useMemo(() => {
    if (period === "all") return orders;

    const now = new Date();
    const from =
      period === "month"
        ? startOfMonth(now)
        : period === "year"
        ? startOfYear(now)
        : subDays(now, 30);

    return orders.filter((order) => new Date(order.order_date) >= from);
  }, [orders, period]);

  const summary = useMemo(() => {
    const totalAmount = filteredOrders.reduce((sum, item) => sum + item.order_amount, 0);
    const totalExpenses = filteredOrders.reduce((sum, item) => sum + item.order_expenses, 0);
    const avgCheck = filteredOrders.length ? totalAmount / filteredOrders.length : 0;
    const expenseRate = totalAmount > 0 ? (totalExpenses / totalAmount) * 100 : 0;

    return { totalAmount, totalExpenses, avgCheck, expenseRate };
  }, [filteredOrders]);

  const categoryData = useMemo(() => {
    const grouped = filteredOrders.reduce<Record<OrderType, { type: OrderType; label: string; value: number }>>(
      (acc, order) => {
        const type = order.order_type;
        if (!acc[type]) {
          acc[type] = { type, label: CATEGORY_LABELS[type], value: 0 };
        }
        acc[type].value += order.order_expenses;
        return acc;
      },
      {} as Record<OrderType, { type: OrderType; label: string; value: number }>
    );

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const monthlyData = useMemo(() => {
    const grouped = new Map<string, { month: string; expenses: number; amount: number }>();

    filteredOrders.forEach((order) => {
      const key = format(new Date(order.order_date), "MMM", { locale: uk });
      const current = grouped.get(key) ?? { month: key, expenses: 0, amount: 0 };
      current.expenses += order.order_expenses;
      current.amount += order.order_amount;
      grouped.set(key, current);
    });

    return Array.from(grouped.values());
  }, [filteredOrders]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб користуватись VIP-аналітикою</p>
          <Button onClick={() => navigate("/auth")}>Увійти</Button>
        </main>
      </div>
    );
  }

  if (vipLoading) {
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
        <main className="container mx-auto max-w-md px-4 py-12">
          <Card className="space-y-4 border-border bg-card p-6 text-center">
            <Crown className="mx-auto h-12 w-12 text-primary" />
            <h1 className="text-xl font-bold">Аналітика доступна лише VIP</h1>
            <p className="text-sm text-muted-foreground">
              Оформіть VIP-членство, щоб бачити структуру витрат по власних замовленнях.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate("/vip/tools")}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Інструменти
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
      <main className="container mx-auto grid grid-cols-12 gap-4 px-4 py-6">
        <aside className="col-span-3 hidden lg:block">
          <Sidebar className="sticky top-20" />
        </aside>

        <section className="col-span-12 space-y-5 pb-24 lg:col-span-9 md:pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/vip/tools")} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Інструменти</span>
              </Button>
              <h1 className="flex min-w-0 items-center gap-2 truncate text-xl font-bold md:text-2xl">
                <LineChartIcon className="h-6 w-6 shrink-0 text-primary" />
                <span className="truncate">Особиста аналітика витрат</span>
              </h1>
            </div>

            <Tabs value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
              <TabsList className="grid h-auto grid-cols-4">
                <TabsTrigger value="30d" className="px-3 py-2 text-xs sm:text-sm">30 днів</TabsTrigger>
                <TabsTrigger value="month" className="px-3 py-2 text-xs sm:text-sm">Місяць</TabsTrigger>
                <TabsTrigger value="year" className="px-3 py-2 text-xs sm:text-sm">Рік</TabsTrigger>
                <TabsTrigger value="all" className="px-3 py-2 text-xs sm:text-sm">Усе</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="p-10 text-center">
              <BriefcaseBusiness className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-1 text-lg font-bold">Ще немає даних для аналітики</h2>
              <p className="text-sm text-muted-foreground">
                Після підтверджених замовлень із заповненими сумами тут з'являться витрати, категорії та динаміка.
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Витрати" value={formatMoney(summary.totalExpenses)} icon={Receipt} />
                <MetricCard title="Оборот" value={formatMoney(summary.totalAmount)} icon={Wallet} />
                <MetricCard title="Середній чек" value={formatMoney(summary.avgCheck)} icon={BriefcaseBusiness} />
                <MetricCard title="Частка витрат" value={`${summary.expenseRate.toFixed(1)}%`} icon={PieChartIcon} />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                <Card className="p-4 xl:col-span-3">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-bold">Динаміка по періодах</h2>
                      <p className="text-sm text-muted-foreground">Порівняння доходу та витрат по місяцях</p>
                    </div>
                  </div>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <BarChart data={monthlyData} margin={{ left: 8, right: 8, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={56} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="var(--color-amount)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </Card>

                <Card className="p-4 xl:col-span-2">
                  <div className="mb-4">
                    <h2 className="font-bold">Структура витрат</h2>
                    <p className="text-sm text-muted-foreground">Розподіл за типами замовлень</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-1">
                    <div className="space-y-2">
                      {categoryData.map((item) => (
                        <div key={item.type} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR_VARS[item.type] }} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <Badge variant="secondary">{formatMoney(item.value)}</Badge>
                        </div>
                      ))}
                    </div>

                    <ChartContainer
                      config={{ total: { label: "Витрати", color: "hsl(var(--primary))" } }}
                      className="mx-auto h-[220px] max-w-[220px]"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
                        <Pie data={categoryData} dataKey="value" nameKey="label" innerRadius={54} outerRadius={84} strokeWidth={4}>
                          {categoryData.map((item) => (
                            <Cell key={item.type} fill={CATEGORY_COLOR_VARS[item.type]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold">Останні підтверджені замовлення</h2>
                    <p className="text-sm text-muted-foreground">Деталі для ручної перевірки витрат</p>
                  </div>
                  <Badge variant="outline">{filteredOrders.length} записів</Badge>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Замовлення</TableHead>
                      <TableHead>Категорія</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead className="text-right">Сума</TableHead>
                      <TableHead className="text-right">Витрати</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice(0, 12).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="min-w-[180px]">
                          <div className="font-medium">{order.title}</div>
                        </TableCell>
                        <TableCell>{CATEGORY_LABELS[order.order_type]}</TableCell>
                        <TableCell>{format(parseISO(order.order_date), "dd.MM.yyyy")}</TableCell>
                        <TableCell className="text-right">{formatMoney(order.order_amount)}</TableCell>
                        <TableCell className="text-right">{formatMoney(order.order_expenses)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-md border bg-muted p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}