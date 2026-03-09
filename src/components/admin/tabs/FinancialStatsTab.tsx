import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, startOfYear, subDays } from "date-fns";
import { uk } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getTitleByPercent } from "@/lib/shareholderRules";
import {
  calcFullProfitDistribution,
  calcNetProfit,
  calcProfitPools,
  type ShareholderInput,
} from "@/lib/shareholderCalculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BarChart3,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Briefcase,
  Crown,
  CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Period filter types ──────────────────────────────────────────────────────

type PeriodType = "all" | "month" | "year" | "last30" | "custom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmedOrder {
  id: string;
  title: string;
  order_date: string;
  order_amount: number;
  order_expenses: number;
}

interface SpecialistEarning {
  id: string;
  name: string;
  ordersCount: number;
  totalEarning: number;
}

interface ShareholderStat {
  id: string;
  name: string;
  shares: number;
  percent: number;
  title: string;
  baseIncome: number;
  titleBonus: number;
  totalIncome: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2) + " ₴";
}

function InfoAlert({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 text-amber-800 dark:text-amber-300">
      <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="text-sm font-medium">{message}</p>
        {sub && <p className="text-xs mt-1 opacity-80">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialStatsTab() {
  const { totalShares, loading: settingsLoading } = useCompanySettings();

  const [orders, setOrders] = useState<ConfirmedOrder[]>([]);
  const [shareholderInputs, setShareholderInputs] = useState<ShareholderInput[]>([]);
  const [shareholderNames, setShareholderNames] = useState<Record<string, string>>({});
  const [specialistNames, setSpecialistNames] = useState<Record<string, string>>({});
  const [orderParticipants, setOrderParticipants] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ordersOpen, setOrdersOpen] = useState(false);
  const [specialistsOpen, setSpecialistsOpen] = useState(false);
  const [shareholdersOpen, setShareholdersOpen] = useState(false);

  // ─── Period filter state ────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodType>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  const periodError = useMemo(() => {
    if (period === "custom" && customFrom && customTo && customFrom > customTo) {
      return "Дата «від» не може бути пізніше за дату «до»";
    }
    return null;
  }, [period, customFrom, customTo]);

  const filteredOrders = useMemo(() => {
    if (periodError) return [];
    if (period === "all") return orders;

    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    switch (period) {
      case "month":
        from = startOfMonth(now);
        break;
      case "year":
        from = startOfYear(now);
        break;
      case "last30":
        from = subDays(now, 30);
        break;
      case "custom":
        from = customFrom;
        to = customTo;
        break;
    }

    return orders.filter((o) => {
      const d = new Date(o.order_date);
      if (from && d < from) return false;
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        if (d > toEnd) return false;
      }
      return true;
    });
  }, [orders, period, customFrom, customTo, periodError]);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (settingsLoading) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Confirmed orders
        const { data: ordersData, error: ordersErr } = await supabase.rpc("get_confirmed_orders_for_forecast");
        if (ordersErr) throw ordersErr;

        const parsedOrders: ConfirmedOrder[] = (ordersData ?? []).map((o: any) => ({
          id: o.id,
          title: o.title,
          order_date: o.order_date,
          order_amount: Number(o.order_amount),
          order_expenses: Number(o.order_expenses),
        }));
        setOrders(parsedOrders);

        // 2. All shareholders
        const { data: sharesData, error: sharesErr } = await supabase.rpc("get_all_shareholders_shares");
        if (sharesErr) throw sharesErr;

        const inputs: ShareholderInput[] = (sharesData ?? []).map((r: any) => ({
          userId: r.user_id,
          shares: r.quantity,
        }));
        setShareholderInputs(inputs);

        // 3. Shareholder names
        const shIds = inputs.map((i) => i.userId);
        if (shIds.length > 0) {
          const { data: profiles } = await supabase.rpc("get_safe_public_profiles_by_ids", { _ids: shIds });
          const names: Record<string, string> = {};
          (profiles ?? []).forEach((p: any) => { names[p.id] = p.full_name || "Без імені"; });
          setShareholderNames(names);
        }

        // 4. Order participants (specialists)
        if (parsedOrders.length > 0) {
          const orderIds = parsedOrders.map((o) => o.id);
          const { data: participants } = await supabase
            .from("specialist_order_participants")
            .select("order_id, specialist_id")
            .in("order_id", orderIds);

          const map: Record<string, string[]> = {};
          const specIds = new Set<string>();
          (participants ?? []).forEach((p: any) => {
            if (!map[p.order_id]) map[p.order_id] = [];
            map[p.order_id].push(p.specialist_id);
            specIds.add(p.specialist_id);
          });
          setOrderParticipants(map);

          // Specialist names
          if (specIds.size > 0) {
            const { data: specProfiles } = await supabase.rpc("get_safe_public_profiles_by_ids", {
              _ids: Array.from(specIds),
            });
            const sn: Record<string, string> = {};
            (specProfiles ?? []).forEach((p: any) => { sn[p.id] = p.full_name || "Без імені"; });
            setSpecialistNames(sn);
          }
        }
      } catch (err: any) {
        console.error("FinancialStatsTab: error:", err);
        setError("Не вдалося завантажити фінансові дані.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [settingsLoading]);

  // ─── Aggregated calculations ────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (filteredOrders.length === 0) return null;

    let totalAmount = 0;
    let totalExpenses = 0;
    let totalNet = 0;
    let totalSpec = 0;
    let totalSharesPool = 0;
    let totalTitlePool = 0;
    let totalAdminFund = 0;

    const orderRows: Array<{
      order: ConfirmedOrder;
      net: number;
      spec: number;
      sharesPool: number;
      titlePool: number;
      adminFund: number;
    }> = [];

    for (const order of filteredOrders) {
      const net = calcNetProfit(order.order_amount, order.order_expenses);
      const pools = calcProfitPools(net);
      totalAmount += order.order_amount;
      totalExpenses += order.order_expenses;
      totalNet += net;
      totalSpec += pools.specialistsPool;
      totalSharesPool += pools.sharesPool;
      totalTitlePool += pools.titleBonusPool;
      totalAdminFund += pools.adminFund;
      orderRows.push({
        order,
        net,
        spec: pools.specialistsPool,
        sharesPool: pools.sharesPool,
        titlePool: pools.titleBonusPool,
        adminFund: pools.adminFund,
      });
    }

    return {
      totalAmount,
      totalExpenses,
      totalNet,
      totalSpec,
      totalSharesPool,
      totalTitlePool,
      totalAdminFund,
      orderRows,
    };
  }, [filteredOrders]);

  // Specialist earnings
  const specialistEarnings = useMemo<SpecialistEarning[]>(() => {
    if (!stats || filteredOrders.length === 0) return [];

    const earnings: Record<string, { ordersCount: number; totalEarning: number }> = {};

    for (const row of stats.orderRows) {
      const participants = orderParticipants[row.order.id] || [];
      if (participants.length === 0) continue;
      const perSpecialist = row.spec / participants.length;

      for (const specId of participants) {
        if (!earnings[specId]) earnings[specId] = { ordersCount: 0, totalEarning: 0 };
        earnings[specId].ordersCount += 1;
        earnings[specId].totalEarning += perSpecialist;
      }
    }

    return Object.entries(earnings).map(([id, data]) => ({
      id,
      name: specialistNames[id] || "Невідомий",
      ...data,
    })).sort((a, b) => b.totalEarning - a.totalEarning);
  }, [stats, orderParticipants, specialistNames, orders]);

  // Shareholder stats
  const shareholderStats = useMemo<ShareholderStat[]>(() => {
    if (!stats || orders.length === 0 || shareholderInputs.length === 0 || totalShares <= 0) return [];

    const totals: Record<string, { baseIncome: number; titleBonus: number; totalIncome: number }> = {};

    for (const order of orders) {
      const dist = calcFullProfitDistribution(
        order.order_amount,
        order.order_expenses,
        shareholderInputs,
        totalShares,
      );
      for (const sh of dist.shareholders) {
        if (!totals[sh.userId]) totals[sh.userId] = { baseIncome: 0, titleBonus: 0, totalIncome: 0 };
        totals[sh.userId].baseIncome += sh.baseIncome;
        totals[sh.userId].titleBonus += sh.titleBonus;
        totals[sh.userId].totalIncome += sh.totalIncome;
      }
    }

    return shareholderInputs.map((si) => {
      const percent = totalShares > 0 ? (si.shares / totalShares) * 100 : 0;
      const titleObj = getTitleByPercent(percent);
      const t = totals[si.userId] || { baseIncome: 0, titleBonus: 0, totalIncome: 0 };
      return {
        id: si.userId,
        name: shareholderNames[si.userId] || "Без імені",
        shares: si.shares,
        percent,
        title: titleObj?.title ?? "—",
        ...t,
      };
    }).sort((a, b) => b.totalIncome - a.totalIncome);
  }, [stats, orders, shareholderInputs, totalShares, shareholderNames]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  const isLoading = loading || settingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Завантаження фінансових даних…</span>
      </div>
    );
  }

  if (error) {
    return <InfoAlert message={error} />;
  }

  if (orders.length === 0) {
    return (
      <InfoAlert
        message="Поки немає підтверджених замовлень для фінансової статистики"
        sub="Статистика з'явиться після підтвердження замовлень із заповненими фінансовими полями."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Фінансова статистика
        </h2>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Read-only · не є бухгалтерією
        </Badge>
      </div>

      {/* ─── Summary Cards ─── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Підтверджених замовлень" value={String(orders.length)} />
          <StatCard label="Сума замовлень" value={fmt(stats.totalAmount)} />
          <StatCard label="Витрати" value={fmt(stats.totalExpenses)} />
          <StatCard label="Чистий прибуток" value={fmt(stats.totalNet)} highlight />
        </div>
      )}

      {/* ─── Distribution Cards ─── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="50% фахівцям" value={fmt(stats.totalSpec)} icon={<Briefcase className="h-4 w-4" />} />
          <StatCard label="20% на акції" value={fmt(stats.totalSharesPool)} icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard label="17.5% титульні бонуси" value={fmt(stats.totalTitlePool)} icon={<Crown className="h-4 w-4" />} />
          <StatCard label="12.5% адмін-фонд" value={fmt(stats.totalAdminFund)} />
        </div>
      )}

      {/* ─── Specialists Section ─── */}
      <Collapsible open={specialistsOpen} onOpenChange={setSpecialistsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Фахівці — прогнозований дохід
              </CardTitle>
              {specialistsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {specialistEarnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Немає фахівців у підтверджених замовленнях</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Фахівець</TableHead>
                        <TableHead className="text-right">Замовлень</TableHead>
                        <TableHead className="text-right">Прогноз доходу</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specialistEarnings.map((se) => (
                        <TableRow key={se.id}>
                          <TableCell className="font-medium">{se.name}</TableCell>
                          <TableCell className="text-right">{se.ordersCount}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            {fmt(se.totalEarning)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── Shareholders Section ─── */}
      <Collapsible open={shareholdersOpen} onOpenChange={setShareholdersOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Акціонери — прогнозований дохід
              </CardTitle>
              {shareholdersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {shareholderStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {totalShares <= 0 ? "Система акцій ще не налаштована" : "Немає акціонерів із акціями"}
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Акціонер</TableHead>
                        <TableHead className="text-right">Акцій</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead>Титул</TableHead>
                        <TableHead className="text-right">Баз. дохід</TableHead>
                        <TableHead className="text-right">Тит. бонус</TableHead>
                        <TableHead className="text-right">Разом</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shareholderStats.map((sh) => (
                        <TableRow key={sh.id}>
                          <TableCell className="font-medium">{sh.name}</TableCell>
                          <TableCell className="text-right">{sh.shares}</TableCell>
                          <TableCell className="text-right">{sh.percent.toFixed(2)}%</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{sh.title}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(sh.baseIncome)}</TableCell>
                          <TableCell className="text-right text-purple-600 dark:text-purple-400">{fmt(sh.titleBonus)}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">{fmt(sh.totalIncome)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── Orders Breakdown ─── */}
      <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Замовлення — розподіл прибутку
              </CardTitle>
              {ordersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {stats && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Замовлення</TableHead>
                        <TableHead className="text-right">Дата</TableHead>
                        <TableHead className="text-right">Сума</TableHead>
                        <TableHead className="text-right">Витрати</TableHead>
                        <TableHead className="text-right">Чист. прибуток</TableHead>
                        <TableHead className="text-right">50% фахівцям</TableHead>
                        <TableHead className="text-right">20% акціям</TableHead>
                        <TableHead className="text-right">17.5% тит.</TableHead>
                        <TableHead className="text-right">12.5% адмін</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.orderRows.map((row) => (
                        <TableRow key={row.order.id}>
                          <TableCell className="font-medium max-w-[160px] truncate">{row.order.title}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(row.order.order_date).toLocaleDateString("uk-UA")}
                          </TableCell>
                          <TableCell className="text-right">{fmt(row.order.order_amount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(row.order.order_expenses)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(row.net)}</TableCell>
                          <TableCell className="text-right">{fmt(row.spec)}</TableCell>
                          <TableCell className="text-right">{fmt(row.sharesPool)}</TableCell>
                          <TableCell className="text-right">{fmt(row.titlePool)}</TableCell>
                          <TableCell className="text-right">{fmt(row.adminFund)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={4} className="text-xs text-muted-foreground">
                          Усього ({orders.length} замовлень)
                        </TableCell>
                        <TableCell className="text-right">{fmt(stats.totalNet)}</TableCell>
                        <TableCell className="text-right">{fmt(stats.totalSpec)}</TableCell>
                        <TableCell className="text-right">{fmt(stats.totalSharesPool)}</TableCell>
                        <TableCell className="text-right">{fmt(stats.totalTitlePool)}</TableCell>
                        <TableCell className="text-right">{fmt(stats.totalAdminFund)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
          : "bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      </div>
      <p
        className={`text-lg font-bold mt-1 ${
          highlight ? "text-green-700 dark:text-green-400" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
