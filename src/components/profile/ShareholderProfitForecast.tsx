import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getTitleByPercent } from "@/lib/shareholderRules";
import {
  calcFullProfitDistribution,
  type ShareholderInput,
} from "@/lib/shareholderCalculations";
import { useProfitDistConfig } from "@/hooks/useProfitDistConfig";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmedOrder {
  id: string;
  title: string;
  order_date: string;
  order_amount: number;
  order_expenses: number;
}

interface OrderForecastRow {
  order: ConfirmedOrder;
  netProfit: number;
  baseIncome: number;
  titleBonus: number;
  totalIncome: number;
}

interface ForecastSummary {
  totalNetProfit: number;
  totalBaseIncome: number;
  totalTitleBonus: number;
  totalIncome: number;
  ordersCount: number;
  rows: OrderForecastRow[];
}

interface Props {
  userId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2) + " $";
}

function InfoAlert({
  icon: Icon,
  message,
  sub,
  color,
}: {
  icon: React.ElementType;
  message: string;
  sub?: string;
  color: "amber" | "blue";
}) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300",
    blue:  "border-blue-200  bg-blue-50  dark:border-blue-800  dark:bg-blue-950/20  text-blue-800  dark:text-blue-300",
  };
  const iconStyles = {
    amber: "text-amber-600 dark:text-amber-400",
    blue:  "text-blue-600  dark:text-blue-400",
  };
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${styles[color]}`}>
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconStyles[color]}`} />
      <div>
        <p className="text-sm font-medium">{message}</p>
        {sub && <p className="text-xs mt-1 opacity-80">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ShareholderProfitForecast({ userId }: Props) {
  const { totalShares, loading: settingsLoading } = useCompanySettings();
  const { config: distConfig, loading: distConfigLoading } = useProfitDistConfig();

  const [userShares, setUserShares]       = useState<number>(0);
  const [allShareholderInputs, setAllShareholderInputs] = useState<ShareholderInput[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen]     = useState(false);

  // ─── Data Fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (settingsLoading) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. User's own shares
        const { data: mySharesData, error: mySharesErr } = await supabase
          .from("shares")
          .select("quantity")
          .eq("user_id", userId)
          .maybeSingle();

        if (mySharesErr && mySharesErr.code !== "PGRST116") throw mySharesErr;
        setUserShares(mySharesData?.quantity ?? 0);

        // 2. All shareholders' shares (via SECURITY DEFINER RPC)
        const { data: allSharesData, error: allSharesErr } = await supabase
          .rpc("get_all_shareholders_shares");
        if (allSharesErr) throw allSharesErr;

        const inputs: ShareholderInput[] = (allSharesData ?? []).map(
          (row: { user_id: string; quantity: number }) => ({
            userId: row.user_id,
            shares: row.quantity,
          })
        );
        setAllShareholderInputs(inputs);

        // 3. Confirmed orders with financials (via SECURITY DEFINER RPC)
        const { data: ordersData, error: ordersErr } = await supabase
          .rpc("get_confirmed_orders_for_forecast");
        if (ordersErr) throw ordersErr;

        setConfirmedOrders(
          (ordersData ?? []).map((o: ConfirmedOrder) => ({
            id: o.id,
            title: o.title,
            order_date: o.order_date,
            order_amount: Number(o.order_amount),
            order_expenses: Number(o.order_expenses),
          }))
        );
      } catch (err: unknown) {
        console.error("ShareholderProfitForecast: помилка завантаження:", err);
        setError("Не вдалося завантажити дані прогнозу.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId, settingsLoading]);

  // ─── Calculations (pure, no DB writes) ─────────────────────────────────────
  const forecast = useMemo<ForecastSummary | null>(() => {
    if (
      loading ||
      settingsLoading ||
      totalShares <= 0 ||
      userShares <= 0 ||
      confirmedOrders.length === 0 ||
      allShareholderInputs.length === 0
    ) return null;

    const rows: OrderForecastRow[] = confirmedOrders.map((order) => {
      const dist = calcFullProfitDistribution(
        order.order_amount,
        order.order_expenses,
        allShareholderInputs,
        totalShares,
        distConfig,
      );
      const me = dist.shareholders.find((s) => s.userId === userId);
      return {
        order,
        netProfit:   dist.netProfit,
        baseIncome:  me?.baseIncome  ?? 0,
        titleBonus:  me?.titleBonus  ?? 0,
        totalIncome: me?.totalIncome ?? 0,
      };
    });

    const sum = rows.reduce(
      (acc, r) => ({
        totalNetProfit:  acc.totalNetProfit  + r.netProfit,
        totalBaseIncome: acc.totalBaseIncome + r.baseIncome,
        totalTitleBonus: acc.totalTitleBonus + r.titleBonus,
        totalIncome:     acc.totalIncome     + r.totalIncome,
      }),
      { totalNetProfit: 0, totalBaseIncome: 0, totalTitleBonus: 0, totalIncome: 0 }
    );

    return { ...sum, ordersCount: rows.length, rows };
  }, [loading, settingsLoading, totalShares, userShares, confirmedOrders, allShareholderInputs, userId, distConfig]);

  // ─── Derived display values ─────────────────────────────────────────────────
  const percentage = totalShares > 0 && userShares > 0
    ? (userShares / totalShares) * 100
    : 0;
  const titleObj  = getTitleByPercent(percentage);
  const titleName = titleObj?.title ?? null;

  // ─── Empty-state logic ──────────────────────────────────────────────────────
  const isDataLoading    = loading || settingsLoading;
  const systemNotSetup   = !isDataLoading && totalShares <= 0;
  const noShares         = !isDataLoading && !systemNotSetup && userShares === 0;
  const noOrders         = !isDataLoading && !systemNotSetup && !noShares && confirmedOrders.length === 0;
  const hasData          = !isDataLoading && !systemNotSetup && !noShares && forecast !== null;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Прогнозований дохід
        </CardTitle>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Read-only · не виплачено
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Loading */}
        {isDataLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Завантаження даних…</span>
          </div>
        )}

        {/* Error */}
        {!isDataLoading && error && (
          <InfoAlert icon={AlertCircle} message={error} color="amber" />
        )}

        {/* System not configured */}
        {systemNotSetup && (
          <InfoAlert
            icon={AlertCircle}
            color="amber"
            message="Система акцій ще не налаштована"
            sub="Адміністратор має задати загальну кількість акцій компанії."
          />
        )}

        {/* No shares */}
        {noShares && (
          <InfoAlert
            icon={AlertCircle}
            color="blue"
            message="Акції ще не призначено"
            sub="Після отримання акцій тут з'явиться прогноз вашого доходу."
          />
        )}

        {/* No confirmed orders with financials */}
        {noOrders && (
          <InfoAlert
            icon={AlertCircle}
            color="blue"
            message="Поки немає підтверджених замовлень для розрахунку"
            sub="Прогноз з'явиться після того, як адміністратор підтвердить замовлення та заповнить їхні фінансові дані."
          />
        )}

        {/* ─── Forecast summary ─────────────────────────────────────────── */}
        {hasData && forecast && (
          <>
            {/* Summary info chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-3 py-1">
                Акцій: <strong>{userShares}</strong>
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                Частка: <strong>{percentage.toFixed(2)}%</strong>
              </span>
              {titleName && (
                <span className="rounded-full bg-muted px-3 py-1">
                  Титул: <strong>{titleName}</strong>
                </span>
              )}
              <span className="rounded-full bg-muted px-3 py-1">
                Замовлень: <strong>{forecast.ordersCount}</strong>
              </span>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="Чистий прибуток (усі)" value={fmt(forecast.totalNetProfit)} />
              <SummaryCard label="Базовий дохід (20%)" value={fmt(forecast.totalBaseIncome)} accent />
              <SummaryCard label="Титульний бонус (17.5%)" value={fmt(forecast.totalTitleBonus)} accent />
              <SummaryCard
                label="Разом прогноз"
                value={fmt(forecast.totalIncome)}
                highlight
              />
            </div>

            {/* ─── Per-order breakdown ───────────────────────────────────── */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-2">
                {detailsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {detailsOpen ? "Сховати деталі по замовленнях" : "Показати деталі по замовленнях"}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="rounded-md border mt-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Замовлення</TableHead>
                        <TableHead className="text-right">Дата</TableHead>
                        <TableHead className="text-right">Сума</TableHead>
                        <TableHead className="text-right">Витрати</TableHead>
                        <TableHead className="text-right">Чист. прибуток</TableHead>
                        <TableHead className="text-right">Баз. дохід</TableHead>
                        <TableHead className="text-right">Тит. бонус</TableHead>
                        <TableHead className="text-right font-semibold">Разом</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecast.rows.map((row) => (
                        <TableRow key={row.order.id}>
                          <TableCell className="font-medium max-w-[160px] truncate">
                            {row.order.title}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs">
                            {new Date(row.order.order_date).toLocaleDateString("uk-UA")}
                          </TableCell>
                          <TableCell className="text-right">{fmt(row.order.order_amount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(row.order.order_expenses)}</TableCell>
                          <TableCell className="text-right">{fmt(row.netProfit)}</TableCell>
                          <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(row.baseIncome)}</TableCell>
                          <TableCell className="text-right text-purple-600 dark:text-purple-400">{fmt(row.titleBonus)}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            {fmt(row.totalIncome)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={4} className="text-muted-foreground text-xs">
                          Усього ({forecast.ordersCount} замовлень)
                        </TableCell>
                        <TableCell className="text-right">{fmt(forecast.totalNetProfit)}</TableCell>
                        <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(forecast.totalBaseIncome)}</TableCell>
                        <TableCell className="text-right text-purple-600 dark:text-purple-400">{fmt(forecast.totalTitleBonus)}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">{fmt(forecast.totalIncome)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
          : "bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p
        className={`text-lg font-bold mt-1 ${
          highlight
            ? "text-green-700 dark:text-green-400"
            : accent
            ? "text-foreground"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
