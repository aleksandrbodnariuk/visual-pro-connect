import { useState, useEffect, useMemo, useCallback } from "react";
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
  Download,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
  return n.toFixed(2) + " $";
}

function getPeriodLabel(period: PeriodType, customFrom?: Date, customTo?: Date): string {
  switch (period) {
    case "all": return "Усі";
    case "month": return "Цей місяць";
    case "year": return "Цей рік";
    case "last30": return "Останні 30 днів";
    case "custom":
      if (customFrom && customTo)
        return `${format(customFrom, "dd.MM.yyyy")} — ${format(customTo, "dd.MM.yyyy")}`;
      return "Власний період";
  }
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function buildCsvContent(
  periodLabel: string,
  stats: {
    totalAmount: number; totalExpenses: number; totalNet: number;
    totalSpec: number; totalSharesPool: number; totalTitlePool: number; totalAdminFund: number;
    orderRows: Array<{ order: ConfirmedOrder; net: number; spec: number; sharesPool: number; titlePool: number; adminFund: number }>;
  },
  filteredCount: number,
  specialistEarnings: SpecialistEarning[],
  shareholderStats: ShareholderStat[],
): string {
  const lines: string[] = [];
  const n = (v: number) => v.toFixed(2);

  // Section 1: Summary
  lines.push("=== ЗВЕДЕНА СТАТИСТИКА ===");
  lines.push(`Період,${escapeCsv(periodLabel)}`);
  lines.push(`Підтверджених замовлень,${filteredCount}`);
  lines.push(`Сума замовлень,${n(stats.totalAmount)}`);
  lines.push(`Витрати,${n(stats.totalExpenses)}`);
  lines.push(`Чистий прибуток,${n(stats.totalNet)}`);
  lines.push(`50% фахівцям,${n(stats.totalSpec)}`);
  lines.push(`20% на акції,${n(stats.totalSharesPool)}`);
  lines.push(`17.5% титульні бонуси,${n(stats.totalTitlePool)}`);
  lines.push(`12.5% адмін-фонд,${n(stats.totalAdminFund)}`);
  lines.push("");

  // Section 2: Orders
  lines.push("=== ЗАМОВЛЕННЯ ===");
  lines.push("Назва,Дата,Сума,Витрати,Чистий прибуток,50% фахівцям,20% акціям,17.5% тит. бонуси,12.5% адмін-фонд");
  for (const row of stats.orderRows) {
    lines.push([
      escapeCsv(row.order.title),
      new Date(row.order.order_date).toLocaleDateString("uk-UA"),
      n(row.order.order_amount), n(row.order.order_expenses), n(row.net),
      n(row.spec), n(row.sharesPool), n(row.titlePool), n(row.adminFund),
    ].join(","));
  }
  lines.push("");

  // Section 3: Specialists
  lines.push("=== ФАХІВЦІ ===");
  lines.push("Фахівець,Замовлень,Прогноз доходу");
  for (const se of specialistEarnings) {
    lines.push([escapeCsv(se.name), String(se.ordersCount), n(se.totalEarning)].join(","));
  }
  lines.push("");

  // Section 4: Shareholders
  lines.push("=== АКЦІОНЕРИ ===");
  lines.push("Акціонер,Акцій,%,Титул,Базовий дохід,Титульний бонус,Разом");
  for (const sh of shareholderStats) {
    lines.push([
      escapeCsv(sh.name), String(sh.shares), sh.percent.toFixed(2), escapeCsv(sh.title),
      n(sh.baseIncome), n(sh.titleBonus), n(sh.totalIncome),
    ].join(","));
  }

  return lines.join("\n");
}

function downloadCsv(content: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function InfoAlert({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted p-4 text-foreground">
      <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{message}</p>
        {sub && <p className="text-xs mt-1 text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialStatsTab() {
  const { totalShares, sharePriceUsd, loading: settingsLoading } = useCompanySettings();

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

  // Save Snapshot dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
  }, [stats, orderParticipants, specialistNames, filteredOrders]);

  // Shareholder stats
  const shareholderStats = useMemo<ShareholderStat[]>(() => {
    if (!stats || filteredOrders.length === 0 || shareholderInputs.length === 0 || totalShares <= 0) return [];

    const totals: Record<string, { baseIncome: number; titleBonus: number; totalIncome: number }> = {};

    for (const order of filteredOrders) {
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
  }, [stats, filteredOrders, shareholderInputs, totalShares, shareholderNames]);

  // ─── Save Snapshot ───────────────────────────────────────────────────────────
  const saveSnapshot = useCallback(async () => {
    if (!stats || filteredOrders.length === 0 || periodError) return;
    setIsSaving(true);
    try {
      const periodLabel = getPeriodLabel(period, customFrom, customTo);
      const createdBy = (await supabase.auth.getSession()).data.session?.user?.id ?? null;

      const payload = {
        summary: {
          period: periodLabel,
          confirmed_orders_count: filteredOrders.length,
          total_amount: stats.totalAmount,
          total_expenses: stats.totalExpenses,
          total_net_profit: stats.totalNet,
          specialists_pool: stats.totalSpec,
          shareholders_pool: stats.totalSharesPool,
          title_bonus_pool: stats.totalTitlePool,
          admin_fund: stats.totalAdminFund,
        },
        orders: stats.orderRows.map((row) => ({
          id: row.order.id,
          title: row.order.title,
          order_date: row.order.order_date,
          order_amount: row.order.order_amount,
          order_expenses: row.order.order_expenses,
          net_profit: row.net,
          specialists_pool: row.spec,
          shares_pool: row.sharesPool,
          title_bonus_pool: row.titlePool,
          admin_fund: row.adminFund,
        })),
        specialists: specialistEarnings.map((se) => ({
          user_id: se.id,
          name: se.name,
          orders_count: se.ordersCount,
          projected_income: se.totalEarning,
        })),
        shareholders: shareholderStats.map((sh) => ({
          user_id: sh.id,
          name: sh.name,
          shares: sh.shares,
          percent: sh.percent,
          title: sh.title,
          base_income: sh.baseIncome,
          title_bonus: sh.titleBonus,
          total_income: sh.totalIncome,
        })),
      };

      const { error } = await supabase.from("calculation_snapshots").insert({
        created_by: createdBy,
        period_type: period,
        period_label: periodLabel,
        custom_from: customFrom ? format(customFrom, "yyyy-MM-dd") : null,
        custom_to: customTo ? format(customTo, "yyyy-MM-dd") : null,
        confirmed_orders_count: filteredOrders.length,
        total_amount: stats.totalAmount,
        total_expenses: stats.totalExpenses,
        total_net_profit: stats.totalNet,
        specialists_pool_50: stats.totalSpec,
        shareholders_pool_20: stats.totalSharesPool,
        title_bonus_pool_17_5: stats.totalTitlePool,
        admin_fund_12_5: stats.totalAdminFund,
        share_price_usd_snapshot: sharePriceUsd,
        total_shares_snapshot: totalShares,
        notes: snapshotNotes.trim() || null,
        snapshot_payload: payload,
      });

      if (error) {
        toast.error("Не вдалося зберегти розрахунок");
        console.error(error);
        return;
      }
      toast.success("Знімок розрахунку збережено");
      setSaveDialogOpen(false);
      setSnapshotNotes("");
    } finally {
      setIsSaving(false);
    }
  }, [
    stats,
    filteredOrders,
    periodError,
    period,
    customFrom,
    customTo,
    specialistEarnings,
    shareholderStats,
    snapshotNotes,
    sharePriceUsd,
    totalShares,
  ]);


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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Фінансова статистика
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!stats || filteredOrders.length === 0}
            onClick={() => {
              if (!stats) return;
              const label = getPeriodLabel(period, customFrom, customTo);
              const csv = buildCsvContent(label, stats, filteredOrders.length, specialistEarnings, shareholderStats);
              const datePart = format(new Date(), "yyyy-MM-dd");
              downloadCsv(csv, `finances-${datePart}.csv`);
              toast.success("CSV-файл завантажено");
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Експорт CSV
          </Button>
          <Button
            size="sm"
            variant="default"
            disabled={!stats || filteredOrders.length === 0 || !!periodError}
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="h-4 w-4 mr-1" />
            Зберегти розрахунок
          </Button>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Read-only · не є бухгалтерією
          </Badge>
        </div>
      </div>

      {/* Save Snapshot Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Зберегти знімок розрахунку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Період: <strong>{getPeriodLabel(period, customFrom, customTo)}</strong><br />
              Замовлень: <strong>{filteredOrders.length}</strong><br />
              Чистий прибуток: <strong>{stats ? fmt(stats.totalNet) : "—"}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="snapshot-notes">Примітка (опційно)</Label>
              <Textarea
                id="snapshot-notes"
                placeholder="Напр. Розрахунок за березень 2026"
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Скасувати</Button>
            <Button
              onClick={saveSnapshot}
              disabled={isSaving || !stats || filteredOrders.length === 0 || !!periodError}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Period Filters ─── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "Усі"],
            ["month", "Цей місяць"],
            ["year", "Цей рік"],
            ["last30", "Останні 30 днів"],
            ["custom", "Власний період"],
          ] as [PeriodType, string][]).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={period === key ? "default" : "outline"}
              onClick={() => setPeriod(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customFrom ? format(customFrom, "dd.MM.yyyy") : "Від"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customTo ? format(customTo, "dd.MM.yyyy") : "До"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {periodError && <InfoAlert message={periodError} />}
      </div>

      {/* ─── No results for period ─── */}
      {!periodError && filteredOrders.length === 0 && orders.length > 0 && (
        <InfoAlert message="За вибраний період підтверджених замовлень не знайдено" />
      )}

      {/* ─── Summary Cards ─── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Підтверджених замовлень" value={String(filteredOrders.length)} />
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
                          Усього ({filteredOrders.length} замовлень)
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
