import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function ShareholdersTab() {
  const { totalShares: dbTotalShares, loading: settingsLoading, updateTotalShares } = useCompanySettings();
  const [totalShares, setTotalShares] = useState<number>(1000);
  const [issuedShares, setIssuedShares] = useState<number>(0);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!settingsLoading) {
      setTotalShares(dbTotalShares);
    }
  }, [dbTotalShares, settingsLoading]);

  useEffect(() => {
    const fetchShareholders = async () => {
      setLoading(true);
      try {
        const { data: allUsers, error: usersError } = await supabase.rpc('get_users_for_admin');
        if (usersError) {
          console.error("Error fetching shareholders:", usersError);
          setShareholders([]);
          setLoading(false);
          return;
        }

        const supabaseShareholders = allUsers?.filter(user => user.is_shareholder === true) || [];
        const shareholdersWithShares = [];
        let totalIssued = 0;

        for (const user of supabaseShareholders) {
          const { data: sharesData, error: sharesError } = await supabase
            .from('shares').select('*').eq('user_id', user.id).limit(1);
          if (sharesError) console.error(`Error fetching shares for ${user.id}:`, sharesError);

          const nameParts = user.full_name ? user.full_name.split(' ') : ['', ''];
          const shares = sharesData && sharesData.length > 0 ? sharesData[0].quantity : 0;
          totalIssued += shares;
          const percentage = totalShares > 0 ? ((shares / totalShares) * 100) : 0;

          shareholdersWithShares.push({
            id: user.id,
            firstName: nameParts[0] || '',
            lastName: nameParts[1] || '',
            phoneNumber: user.phone_number,
            avatarUrl: user.avatar_url,
            shares,
            percentage: percentage.toFixed(2),
            title: user.title || "Акціонер",
            profit: 0,
            isShareHolder: true,
          });
        }

        setShareholders(shareholdersWithShares);
        setIssuedShares(totalIssued);
      } catch (error) {
        console.error("Error fetching shareholders data:", error);
        toast.error("Помилка при отриманні даних акціонерів");
      } finally {
        setLoading(false);
      }
    };
    fetchShareholders();
  }, [totalShares]);

  const calculatePercentages = (shareholders: any[], total: number) => {
    return shareholders.map(sh => {
      const percentage = total > 0 ? ((sh.shares / total) * 100) : 0;
      return { ...sh, percentage: percentage.toFixed(2) };
    });
  };

  const saveTotalShares = async () => {
    if (isNaN(totalShares) || totalShares <= 0) {
      toast.error("Загальна кількість акцій повинна бути додатнім числом");
      return;
    }
    const success = await updateTotalShares(totalShares);
    if (success) {
      const updatedShareholders = calculatePercentages(shareholders, totalShares);
      setShareholders(updatedShareholders);
      toast.success(`Загальну кількість акцій встановлено: ${totalShares}`);
    } else {
      setTotalShares(dbTotalShares);
    }
  };

  const changeShareholderTitle = async (userId: string, newTitle: string) => {
    try {
      const updatedShareholders = shareholders.map(sh =>
        sh.id === userId ? { ...sh, title: newTitle } : sh
      );
      setShareholders(updatedShareholders);

      const { error } = await supabase.from('users').update({ title: newTitle }).eq('id', userId);
      if (error) {
        console.error("Error updating title:", error);
        toast.error("Не вдалося зберегти титул");
        return;
      }
      toast.success(`Титул акціонера змінено на "${newTitle}"`);
    } catch (error) {
      console.error("Error updating shareholder title:", error);
      toast.error("Помилка при зміні титулу акціонера");
    }
  };

  const updateSharesCount = async (userId: string, sharesCount: number) => {
    if (isNaN(sharesCount) || sharesCount < 0) {
      toast.error("Кількість акцій не може бути від'ємною");
      return;
    }
    const previousShareholders = [...shareholders];
    try {
      const updatedShareholders = shareholders.map(sh =>
        sh.id === userId ? { ...sh, shares: sharesCount } : sh
      );
      setShareholders(updatedShareholders);

      const { data: existingShares, error: checkError } = await supabase
        .from('shares').select('id').eq('user_id', userId);
      if (checkError) {
        setShareholders(previousShareholders);
        toast.error("Помилка при перевірці акцій");
        return;
      }

      let dbError: any = null;
      if (existingShares && existingShares.length > 0) {
        const { error } = await supabase.from('shares').update({ quantity: sharesCount }).eq('user_id', userId);
        dbError = error;
      } else {
        const { error } = await supabase.from('shares').insert({ user_id: userId, quantity: sharesCount });
        dbError = error;
      }

      if (dbError) {
        setShareholders(previousShareholders);
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

      // Recalculate issued shares
      const newIssued = updatedShareholders.reduce((sum, sh) => sum + sh.shares, 0);
      setIssuedShares(newIssued);
      toast.success("Кількість акцій оновлено");
    } catch (error) {
      setShareholders(previousShareholders);
      toast.error("Помилка при оновленні кількості акцій");
    }
  };

  const availableShares = totalShares - issuedShares;

  return (
    <div className="space-y-6">
      {/* Shares Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Загальна кількість</p>
            </div>
            <h3 className="text-2xl font-bold">{totalShares}</h3>
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
            <h3 className="text-2xl font-bold text-green-600">{availableShares}</h3>
          </CardContent>
        </Card>
      </div>

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
                placeholder="1000"
                value={totalShares}
                onChange={(e) => setTotalShares(parseInt(e.target.value) || 0)}
                disabled={settingsLoading}
              />
            </div>
            <Button onClick={saveTotalShares} disabled={settingsLoading}>
              <Save className="mr-2 h-4 w-4" /> Зберегти
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Управління акціонерами</CardTitle>
          <CardDescription>Перегляд акціонерів та розподіл прибутку</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Акціонер</th>
                      <th className="text-left p-2">Титул</th>
                      <th className="text-left p-2">Кількість акцій</th>
                      <th className="text-left p-2">Частка (%)</th>
                      <th className="text-left p-2">Прибуток (USD)</th>
                      <th className="text-left p-2">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareholders.length > 0 ? (
                      shareholders.map((shareholder) => (
                        <tr key={shareholder.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{shareholder.firstName} {shareholder.lastName}</td>
                          <td className="p-2">
                            <Select
                              defaultValue={shareholder.title || "Магнат"}
                              onValueChange={(value) => changeShareholderTitle(shareholder.id, value)}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Титул" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Акціонер", "Магнат", "Барон", "Граф", "Маркіз", "Лорд", "Герцог", "Імператор"].map((title) => (
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
                                onChange={(e) => updateSharesCount(shareholder.id, parseInt(e.target.value))}
                              />
                              <Button variant="outline" size="sm" onClick={() => updateSharesCount(shareholder.id, shareholder.shares + 1)}>+</Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSharesCount(shareholder.id, Math.max(0, shareholder.shares - 1))}
                                disabled={shareholder.shares <= 0}
                              >-</Button>
                            </div>
                          </td>
                          <td className="p-2">{shareholder.percentage}%</td>
                          <td className="p-2">{shareholder.profit?.toFixed(2) || "0.00"} USD</td>
                          <td className="p-2">
                            <Button variant="outline" size="sm" className="mr-2">
                              <PenLine className="h-4 w-4 mr-1" /> Деталі
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-2 text-center text-muted-foreground">Немає зареєстрованих акціонерів</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {shareholders.length > 0 ? (
                  shareholders.map((shareholder) => (
                    <Card key={shareholder.id} className="p-4">
                      <div className="space-y-3">
                        <h3 className="font-semibold">{shareholder.firstName} {shareholder.lastName}</h3>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Титул:</span>
                          <Select
                            defaultValue={shareholder.title || "Магнат"}
                            onValueChange={(value) => changeShareholderTitle(shareholder.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Титул" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Акціонер", "Магнат", "Барон", "Граф", "Маркіз", "Лорд", "Герцог", "Імператор"].map((title) => (
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
                              onChange={(e) => updateSharesCount(shareholder.id, parseInt(e.target.value))}
                            />
                            <Button variant="outline" size="sm" onClick={() => updateSharesCount(shareholder.id, shareholder.shares + 1)}>+</Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSharesCount(shareholder.id, Math.max(0, shareholder.shares - 1))}
                              disabled={shareholder.shares <= 0}
                            >-</Button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Частка:</span>
                          <span className="text-sm font-medium">{shareholder.percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Прибуток:</span>
                          <span className="text-sm font-medium">{shareholder.profit?.toFixed(2) || "0.00"} USD</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          <PenLine className="h-4 w-4 mr-1" /> Деталі
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Немає зареєстрованих акціонерів</div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
