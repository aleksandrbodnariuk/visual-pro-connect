import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine, Save, Info, AlertCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { SharePriceControl } from "@/components/admin/SharePriceControl";
import { calcFullProfitDistribution, type ShareholderInput } from "@/lib/shareholderCalculations";

import { getTitleName } from "@/lib/shareholderRules";

export function ShareholdersTab() {
  const {
    totalShares: dbTotalShares,
    sharePriceUsd,
    loading: settingsLoading,
    updateTotalShares,
    settings,
  } = useCompanySettings();

  const [totalSharesInput, setTotalSharesInput] = useState<number>(0);
  const [issuedShares, setIssuedShares] = useState<number>(0);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmedOrders, setConfirmedOrders] = useState<any[]>([]);

  // Sync input with DB value once loaded
  useEffect(() => {
    if (!settingsLoading) {
      setTotalSharesInput(dbTotalShares);
    }
  }, [dbTotalShares, settingsLoading]);

  const fetchShareholders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: allUsers, error: usersError } = await supabase.rpc('get_users_for_admin');
      if (usersError) {
        console.error("Error fetching shareholders:", usersError);
        setShareholders([]);
        return;
      }

      const supabaseShareholders = allUsers?.filter(u => u.is_shareholder === true) || [];
      const shareholdersWithShares = [];
      let totalIssued = 0;

      for (const user of supabaseShareholders) {
        const { data: sharesData } = await supabase
          .from('shares').select('*').eq('user_id', user.id).limit(1);

        const nameParts = user.full_name ? user.full_name.split(' ') : ['', ''];
        const shares = sharesData && sharesData.length > 0 ? sharesData[0].quantity : 0;
        totalIssued += shares;
        const percentage = dbTotalShares > 0 ? ((shares / dbTotalShares) * 100) : 0;

        shareholdersWithShares.push({
          id: user.id,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          phoneNumber: user.phone_number,
          avatarUrl: user.avatar_url,
          shares,
          percentage: percentage.toFixed(2),
          title: user.title || "Акціонер",
          isShareHolder: true,
        });
      }

      setShareholders(shareholdersWithShares);
      setIssuedShares(totalIssued);

      // Fetch confirmed orders for profit calculation
      const { data: ordersData } = await supabase.rpc('get_confirmed_orders_for_forecast');
      setConfirmedOrders(ordersData || []);
    } catch (error) {
      console.error("Error fetching shareholders data:", error);
      toast.error("Помилка при отриманні даних акціонерів");
    } finally {
      setLoading(false);
    }
  }, [dbTotalShares]);

  useEffect(() => {
    if (!settingsLoading) {
      fetchShareholders();
    }
  }, [fetchShareholders, settingsLoading]);

  const recalcPercentages = (list: any[], total: number) =>
    list.map(sh => ({
      ...sh,
      percentage: total > 0 ? ((sh.shares / total) * 100).toFixed(2) : '0.00',
    }));

  const saveTotalShares = async () => {
    if (isNaN(totalSharesInput) || totalSharesInput <= 0) {
      toast.error("Загальна кількість акцій повинна бути додатнім числом");
      return;
    }
    const success = await updateTotalShares(totalSharesInput);
    if (success) {
      setShareholders(recalcPercentages(shareholders, totalSharesInput));
      toast.success(`Загальну кількість акцій встановлено: ${totalSharesInput}`);
    } else {
      setTotalSharesInput(dbTotalShares);
    }
  };

  // Title is now auto-calculated by DB trigger on shares change

  const updateSharesCount = async (userId: string, sharesCount: number) => {
    if (isNaN(sharesCount) || sharesCount < 0) {
      toast.error("Кількість акцій не може бути від'ємною");
      return;
    }
    const previous = [...shareholders];
    setShareholders(prev => prev.map(sh => sh.id === userId ? { ...sh, shares: sharesCount } : sh));

    const { data: existing } = await supabase.from('shares').select('id').eq('user_id', userId);

    let dbError: any = null;
    if (existing && existing.length > 0) {
      const { error } = await supabase.from('shares').update({ quantity: sharesCount }).eq('user_id', userId);
      dbError = error;
    } else {
      const { error } = await supabase.from('shares').insert({ user_id: userId, quantity: sharesCount });
      dbError = error;
    }

    if (dbError) {
      setShareholders(previous);
      const msg = dbError.message || '';
      if (msg.includes('Неможливо видати більше акцій')) {
        toast.error("Неможливо видати більше акцій, ніж визначено в компанії");
      } else if (msg.includes("від'ємною")) {
        toast.error("Кількість акцій не може бути від'ємною");
      } else {
        toast.error("Помилка при оновленні кількості акцій");
      }
      return;
    }

    const newIssued = shareholders.reduce((sum, sh) => sum + (sh.id === userId ? sharesCount : sh.shares), 0);
    setIssuedShares(newIssued);
    toast.success("Кількість акцій оновлено");
    // Refresh to get updated title from DB trigger
    setTimeout(() => fetchShareholders(), 500);
  };

  const availableShares = Math.max(0, dbTotalShares - issuedShares);
  // System is in setup state if total shares is 0 (not yet configured by admin)
  const systemNotConfigured = !settingsLoading && dbTotalShares <= 0;

  // Calculate profit forecasts for all shareholders based on confirmed orders
  const profitForecasts = useMemo(() => {
    if (dbTotalShares <= 0 || shareholders.length === 0 || confirmedOrders.length === 0) {
      return {};
    }

    const shareholderInputs: ShareholderInput[] = shareholders.map(sh => ({
      userId: sh.id,
      shares: sh.shares,
    }));

    // Sum up forecasts from all confirmed orders
    const totals: Record<string, number> = {};
    
    for (const order of confirmedOrders) {
      const dist = calcFullProfitDistribution(
        Number(order.order_amount),
        Number(order.order_expenses),
        shareholderInputs,
        dbTotalShares
      );
      
      for (const sh of dist.shareholders) {
        totals[sh.userId] = (totals[sh.userId] || 0) + sh.totalIncome;
      }
    }
    
    return totals;
  }, [shareholders, confirmedOrders, dbTotalShares]);

  const getProfitDisplay = (userId: string, shares: number) => {
    if (dbTotalShares <= 0) return "—";
    if (shares <= 0) return "Акції не призначено";
    if (confirmedOrders.length === 0) return "Немає замовлень";
    const profit = profitForecasts[userId];
    if (profit === undefined || profit === 0) return "0.00 ₴";
    return `${profit.toFixed(2)} ₴`;
  };

  return (
    <div className="space-y-6">
      {/* ─── System not configured banner ─── */}
      {systemNotConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
          <Settings className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Систему акцій ще не налаштовано
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Встановіть загальну кількість акцій та орієнтовну ціну нижче, щоб розпочати роботу з акціонерами.
            </p>
          </div>
        </div>
      )}

      {/* ─── Shares overview cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Загальна кількість</p>
            </div>
            {settingsLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : dbTotalShares > 0 ? (
              <h3 className="text-2xl font-bold">{dbTotalShares}</h3>
            ) : (
              <p className="text-sm text-muted-foreground italic">Не задано</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Видано акцій</p>
            </div>
            <h3 className="text-2xl font-bold">{issuedShares}</h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Доступно</p>
            </div>
            {dbTotalShares > 0 ? (
              <h3 className="text-2xl font-bold text-green-600">{availableShares}</h3>
            ) : (
              <p className="text-sm text-muted-foreground italic">Не розраховано</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Total shares setting ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Загальна кількість акцій</CardTitle>
          <CardDescription>Встановіть загальну кількість акцій компанії</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="total-shares">Загальна кількість акцій</Label>
              <Input
                id="total-shares"
                type="number"
                min="1"
                placeholder="Наприклад: 1000"
                value={totalSharesInput || ''}
                onChange={(e) => setTotalSharesInput(parseInt(e.target.value) || 0)}
                disabled={settingsLoading}
              />
            </div>
            <Button
              onClick={saveTotalShares}
              disabled={settingsLoading || totalSharesInput <= 0}
            >
              <Save className="mr-2 h-4 w-4" /> Зберегти
            </Button>
          </div>
          {dbTotalShares > 0 && issuedShares > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Не можна зменшити нижче вже виданих {issuedShares} акцій.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Share price setting ─── */}
      <SharePriceControl />

      {/* ─── Shareholders management ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Управління акціонерами</CardTitle>
          <CardDescription>Перегляд акціонерів та розподіл акцій</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : shareholders.length === 0 ? (
            /* ─── Empty state ─── */
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">У системі ще немає акціонерів</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Щоб додати акціонера, перейдіть у вкладку «Користувачі», знайдіть потрібного користувача та увімкніть йому статус акціонера. Після цього призначте кількість акцій тут.
              </p>
              {dbTotalShares <= 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Спочатку задайте загальну кількість акцій вище.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* ─── Desktop Table ─── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Акціонер</th>
                      <th className="text-left p-2">Титул</th>
                      <th className="text-left p-2">Кількість акцій</th>
                      <th className="text-left p-2">Відсоток (%)</th>
                      <th className="text-left p-2">Прибуток (USD)</th>
                      <th className="text-left p-2">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareholders.map((shareholder) => (
                      <tr key={shareholder.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{shareholder.firstName} {shareholder.lastName}</td>
                        <td className="p-2">
                          <Select
                            value={shareholder.title || "Акціонер"}
                            onValueChange={(value) => changeShareholderTitle(shareholder.id, value)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Титул" />
                            </SelectTrigger>
                            <SelectContent>
                              {TITLES.map((title) => (
                                <SelectItem key={title} value={title}>{title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              className="w-24"
                              min="0"
                              value={shareholder.shares}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) updateSharesCount(shareholder.id, val);
                              }}
                            />
                            <Button variant="outline" size="sm" onClick={() => updateSharesCount(shareholder.id, shareholder.shares + 1)}>+</Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSharesCount(shareholder.id, Math.max(0, shareholder.shares - 1))}
                              disabled={shareholder.shares <= 0}
                            >−</Button>
                          </div>
                        </td>
                        <td className="p-2">
                          {dbTotalShares > 0 ? `${shareholder.percentage}%` : (
                            <span className="text-muted-foreground text-sm italic">Не розраховано</span>
                          )}
                        </td>
                        <td className="p-2 text-sm">
                          {getProfitDisplay(shareholder.id, shareholder.shares)}
                        </td>
                        <td className="p-2">
                          <Button variant="outline" size="sm">
                            <PenLine className="h-4 w-4 mr-1" /> Деталі
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ─── Mobile Cards ─── */}
              <div className="md:hidden space-y-4">
                {shareholders.map((shareholder) => (
                  <Card key={shareholder.id} className="p-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold">{shareholder.firstName} {shareholder.lastName}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Титул:</span>
                        <Select
                          value={shareholder.title || "Акціонер"}
                          onValueChange={(value) => changeShareholderTitle(shareholder.id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Титул" />
                          </SelectTrigger>
                          <SelectContent>
                            {TITLES.map((title) => (
                              <SelectItem key={title} value={title}>{title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Кількість акцій:</span>
                        <div className="flex gap-1 items-center">
                          <Input
                            type="number"
                            className="w-20"
                            min="0"
                            value={shareholder.shares}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) updateSharesCount(shareholder.id, val);
                            }}
                          />
                          <Button variant="outline" size="sm" onClick={() => updateSharesCount(shareholder.id, shareholder.shares + 1)}>+</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateSharesCount(shareholder.id, Math.max(0, shareholder.shares - 1))}
                            disabled={shareholder.shares <= 0}
                          >−</Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Відсоток:</span>
                        <span className="text-sm font-medium">
                          {dbTotalShares > 0 ? `${shareholder.percentage}%` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Прибуток:</span>
                        <span className="text-sm font-medium">
                          {getProfitDisplay(shareholder.id, shareholder.shares)}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <PenLine className="h-4 w-4 mr-1" /> Деталі
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
