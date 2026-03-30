
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, PiggyBank, DollarSign, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getTitleByPercent, getVisibleTitle } from "@/lib/shareholderRules";
import { ShareholderProfitForecast } from "./ShareholderProfitForecast";
import { ShareholderPayouts } from "./ShareholderPayouts";

interface ShareholderSectionProps {
  user: {
    id: string;
    shares?: number;
    percentage?: number;
    profit?: number;
    title?: string;
    isShareHolder?: boolean;
  };
}

export function ShareholderSection({ user }: ShareholderSectionProps) {
  const { totalShares, sharePriceUsd, loading: settingsLoading } = useCompanySettings();
  const [shares, setShares] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShareholderData = async () => {
      if (!user?.id || !user?.isShareHolder || settingsLoading) return;

      setLoading(true);
      try {
        const { data: sharesData, error } = await supabase
          .from('shares')
          .select('quantity')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error("Помилка при отриманні даних акцій:", error);
        }

        setShares(sharesData?.quantity ?? 0);
      } catch (err) {
        console.error("Помилка при завантаженні даних акціонера:", err);
      } finally {
        setLoading(false);
      }
    };

    loadShareholderData();
  }, [user?.id, user?.isShareHolder, settingsLoading]);

  if (!user?.isShareHolder) return null;

  const percentage = totalShares > 0 && shares > 0
    ? (shares / totalShares) * 100
    : 0;
  const titleObj = getTitleByPercent(percentage);
  const titleName = titleObj?.title ?? null;

  const getBadgeVariant = () => {
    switch (titleName) {
      case "Імператор": return "destructive" as const;
      case "Герцог":
      case "Лорд":
      case "Маркіз": return "secondary" as const;
      case "Граф":
      case "Барон": return "default" as const;
      case "Магнат":
      case "Акціонер": return "outline" as const;
      default: return "outline" as const;
    }
  };

  const systemNotConfigured = !settingsLoading && totalShares <= 0;
  const noSharesYet = !loading && !settingsLoading && totalShares > 0 && shares === 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Інформація акціонера
          </CardTitle>
          {titleName ? (
            <Badge variant={getBadgeVariant()} className="text-lg px-3 py-1">
              {titleName}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground">
              Титул не визначено
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {systemNotConfigured && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
              <Settings className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Загальну кількість акцій ще не задано
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Адміністратор має налаштувати систему акцій у адмін-панелі. Після цього відсоток та розрахунки стануть доступні.
                </p>
              </div>
            </div>
          )}

          {noSharesYet && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-4">
              <PiggyBank className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Акції ще не призначено
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Адміністратор призначить вам кількість акцій. Після цього тут з'являться дані та ваш титул.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Кількість акцій</p>
                    {loading || settingsLoading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
                    ) : (
                      <h3 className="text-2xl font-bold mt-1">{shares}</h3>
                    )}
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <PiggyBank className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Відсоток акцій</p>
                    {loading || settingsLoading ? (
                      <div className="h-8 w-20 bg-muted animate-pulse rounded mt-1" />
                    ) : systemNotConfigured ? (
                      <p className="text-sm text-muted-foreground mt-1">Не розраховано</p>
                    ) : (
                      <h3 className="text-2xl font-bold mt-1">{percentage.toFixed(2)}%</h3>
                    )}
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Crown className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Прибуток</p>
                    <p className="text-sm text-muted-foreground mt-1">Після першого замовлення</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-md p-4">
            <h3 className="font-semibold mb-2">Інформація про ринок акцій</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Як акціонер компанії, ви маєте доступ до ринку акцій, де можете передавати та отримувати акції.
              {sharePriceUsd > 0
                ? ` Поточна орієнтовна вартість акції: ${sharePriceUsd} USD.`
                : ' Орієнтовну ціну акції ще не встановлено.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Прибуток з кожного замовлення розподіляється між акціонерами відповідно до відсотка акцій.
              20% чистого прибутку розподіляється на всі акції пропорційно.
            </p>

            {titleObj && titleObj.level >= 2 ? (
              <div className="mt-4 border-t pt-4">
                <h4 className="font-medium mb-2">Система титулів</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    { range: '1–4%',   title: 'Акціонер' },
                    { range: '5–9%',   title: 'Магнат'   },
                    { range: '10–19%', title: 'Барон'    },
                    { range: '20–29%', title: 'Граф'     },
                    { range: '30–39%', title: 'Маркіз'   },
                    { range: '40–49%', title: 'Лорд'     },
                    { range: '50–99%', title: 'Герцог'   },
                    { range: '100%',   title: 'Імператор'},
                  ].map(({ range, title }) => (
                    <div
                      key={title}
                      className={`bg-muted p-2 rounded ${titleName === title ? 'ring-2 ring-primary font-bold' : ''}`}
                    >
                      <span className="font-semibold">{range}:</span> {title}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Детальна інформація про систему титулів доступна для акціонерів рівня «Барон» і вище.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Payouts ─── */}
      <ShareholderPayouts userId={user.id} />

      {/* ─── Profit Forecast (read-only, no DB writes) ─── */}
      <ShareholderProfitForecast userId={user.id} />
    </>
  );
}
