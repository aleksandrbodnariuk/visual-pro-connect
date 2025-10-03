import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { SHAREHOLDER_TITLES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

const TITLE_PERCENTAGES = [
  { min: 0, max: 5, title: "Акціонер" },
  { min: 6, max: 10, title: "Магнат" },
  { min: 11, max: 20, title: "Барон" },
  { min: 21, max: 35, title: "Граф" },
  { min: 36, max: 50, title: "Маркіз" },
  { min: 51, max: 75, title: "Лорд" },
  { min: 76, max: 99, title: "Герцог" },
  { min: 100, max: 100, title: "Імператор" }
];

export function ShareholdersTab() {
  const [totalShares, setTotalShares] = useState<number>(() => {
    return parseInt(localStorage.getItem("totalShares") || "1000");
  });
  
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchShareholders = async () => {
      setLoading(true);
      
      try {
        // Отримуємо користувачів з Supabase, які є акціонерами
        const { data: allUsers, error: usersError } = await supabase
          .rpc('get_users_for_admin');
        
        const supabaseShareholders = allUsers?.filter(user => user.is_shareholder === true);
          
        if (usersError) {
          console.error("Error fetching shareholders:", usersError);
          const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
          const localShareholders = storedUsers.filter((user: any) => 
            user.isShareHolder || user.role === "shareholder"
          );
          
          const formattedShareholders = localShareholders.map((sh: any) => ({
            ...sh,
            shares: sh.shares || 10,
            title: sh.title || "Магнат",
            profit: sh.profit || 0
          }));
          
          setShareholders(formattedShareholders);
          return;
        }
        
        // Отримуємо дані про акції кожного акціонера
        const shareholdersWithShares = [];
        
        for (const user of (supabaseShareholders || [])) {
          // Шукаємо відповідний запис в таблиці shares
          const { data: sharesData, error: sharesError } = await supabase
            .from('shares')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);
            
          if (sharesError) {
            console.error(`Error fetching shares for ${user.id}:`, sharesError);
          }
          
          // Парсимо ім'я та прізвище з full_name
          const nameParts = user.full_name ? user.full_name.split(' ') : ['', ''];
          
          // Визначаємо кількість акцій
          const shares = sharesData && sharesData.length > 0 
            ? sharesData[0].quantity 
            : 10;
            
          // Визначаємо відсоток
          const percentage = totalShares > 0 ? ((shares / totalShares) * 100) : 0;
          const percentageFormatted = percentage.toFixed(2);
          
          // Визначаємо титул на основі відсотка
          const titleInfo = TITLE_PERCENTAGES.find(
            range => percentage >= range.min && percentage <= range.max
          );
          
          const title = titleInfo ? titleInfo.title : "Акціонер";
          
          // Додаємо користувача до списку
          shareholdersWithShares.push({
            id: user.id,
            firstName: nameParts[0] || '',
            lastName: nameParts[1] || '',
            phoneNumber: user.phone_number,
            avatarUrl: user.avatar_url,
            shares,
            percentage: percentageFormatted,
            title: title,
            profit: 0, // Прибуток поки 0
            isShareHolder: true
          });
        }
        
        setShareholders(shareholdersWithShares);
      } catch (error) {
        console.error("Error fetching shareholders data:", error);
        toast.error("Помилка при отриманні даних акціонерів");
      } finally {
        setLoading(false);
      }
    };
    
    fetchShareholders();
  }, [totalShares]);

  // Recalculate percentages whenever shareholders or totalShares change
  useEffect(() => {
    if (totalShares <= 0 || shareholders.length === 0) return;
    
    const updatedShareholders = shareholders.map(sh => {
      const percentage = ((sh.shares / totalShares) * 100);
      const percentageFormatted = percentage.toFixed(2);
      
      // Find the appropriate title based on percentage
      const titleInfo = TITLE_PERCENTAGES.find(
        range => percentage >= range.min && percentage <= range.max
      );
      
      const newTitle = titleInfo ? titleInfo.title : "Акціонер";
      
      return { 
        ...sh, 
        percentage: percentageFormatted,
        title: newTitle
      };
    });
    
    setShareholders(updatedShareholders);
    
    // Update users in localStorage with new titles
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const updatedUsers = storedUsers.map((user: any) => {
      const updatedShareholder = updatedShareholders.find(sh => sh.id === user.id);
      if (updatedShareholder) {
        return { 
          ...user, 
          percentage: updatedShareholder.percentage,
          title: updatedShareholder.title,
          shares: updatedShareholder.shares
        };
      }
      return user;
    });
    
    localStorage.setItem("users", JSON.stringify(updatedUsers));
  }, [shareholders, totalShares]);
  
  const saveTotalShares = async () => {
    if (isNaN(totalShares) || totalShares <= 0) {
      toast.error("Загальна кількість акцій повинна бути додатнім числом");
      return;
    }
    
    localStorage.setItem("totalShares", totalShares.toString());
    
    // Recalculate all percentages
    const updatedShareholders = calculatePercentages(shareholders, totalShares);
    setShareholders(updatedShareholders);
    
    toast.success(`Загальну кількість акцій встановлено: ${totalShares}`);
  };

  const calculatePercentages = (shareholders: any[], total: number) => {
    return shareholders.map(sh => {
      const percentage = total > 0 ? ((sh.shares / total) * 100) : 0;
      const percentageFormatted = percentage.toFixed(2);
      
      // Find the appropriate title based on percentage
      const titleInfo = TITLE_PERCENTAGES.find(
        range => percentage >= range.min && percentage <= range.max
      );
      
      const newTitle = titleInfo ? titleInfo.title : "Акціонер";
      
      return { 
        ...sh, 
        percentage: percentageFormatted,
        title: newTitle
      };
    });
  };

  const changeShareholderTitle = async (userId: string, newTitle: string) => {
    try {
      // Оновлюємо локальний стан
      const updatedShareholders = shareholders.map(sh => {
        if (sh.id === userId) {
          return { ...sh, title: newTitle };
        }
        return sh;
      });
      
      setShareholders(updatedShareholders);
      
      // Оновлюємо дані в локальному сховищі
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const updatedUsers = storedUsers.map((user: any) => {
        if (user.id === userId) {
          return { ...user, title: newTitle };
        }
        return user;
      });
      
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      
      // Use an update object that matches the database schema
      const updateData: Record<string, any> = {
        // Use the title property in a custom metadata field
        // since title is not in the database schema
        categories: [newTitle] // Store the title in categories array
      };
      
      // Пробуємо оновити запис в Supabase
      const user = updatedShareholders.find(sh => sh.id === userId);
      if (user) {
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);
          
        if (error) {
          console.error("Error updating title in Supabase:", error);
        }
      }
      
      toast.success(`Титул акціонера змінено на "${newTitle}"`);
    } catch (error) {
      console.error("Error updating shareholder title:", error);
      toast.error("Помилка при зміні титулу акціонера");
    }
  };

  const updateSharesCount = async (userId: string, sharesCount: number) => {
    if (isNaN(sharesCount) || sharesCount < 0) {
      toast.error("Кількість акцій повинна бути додатнім числом");
      return;
    }

    try {
      // Оновлюємо локальний стан
      const updatedShareholders = shareholders.map(sh => {
        if (sh.id === userId) {
          return { ...sh, shares: sharesCount };
        }
        return sh;
      });
      
      setShareholders(updatedShareholders);
      
      // Оновлюємо дані в локальному сховищі
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const updatedUsers = storedUsers.map((user: any) => {
        if (user.id === userId) {
          return { ...user, shares: sharesCount };
        }
        return user;
      });
      
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      
      // Пробуємо оновити запис в таблиці shares в Supabase
      // Спочатку перевіряємо, чи існує запис
      const { data: existingShares, error: checkError } = await supabase
        .from('shares')
        .select('id')
        .eq('user_id', userId);
        
      if (checkError) {
        console.error(`Error checking shares for ${userId}:`, checkError);
      }
      
      // Якщо запис існує, оновлюємо його
      if (existingShares && existingShares.length > 0) {
        const { error: updateError } = await supabase
          .from('shares')
          .update({ quantity: sharesCount })
          .eq('user_id', userId);
          
        if (updateError) {
          console.error(`Error updating shares for ${userId}:`, updateError);
        }
      } 
      // Якщо запису немає, створюємо новий
      else {
        const { error: insertError } = await supabase
          .from('shares')
          .insert({ user_id: userId, quantity: sharesCount });
          
        if (insertError) {
          console.error(`Error inserting shares for ${userId}:`, insertError);
        }
      }
      
      toast.success("Кількість акцій оновлено");
    } catch (error) {
      console.error("Error updating shares count:", error);
      toast.error("Помилка при оновленні кількості акцій");
    }
  };

  return (
    <div className="space-y-6">
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
              />
            </div>
            <Button onClick={saveTotalShares}>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Акціонер</th>
                    <th className="text-left p-2">Титул</th>
                    <th className="text-left p-2">Кількість акцій</th>
                    <th className="text-left p-2">Частка (%)</th>
                    <th className="text-left p-2">Прибуток (грн)</th>
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
                                <SelectItem key={title} value={title}>
                                  {title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              className="w-24"
                              min="1"
                              value={shareholder.shares || 10}
                              onChange={(e) => updateSharesCount(shareholder.id, parseInt(e.target.value))}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => updateSharesCount(shareholder.id, (shareholder.shares || 10) + 1)}
                            >
                              +
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => updateSharesCount(
                                shareholder.id, 
                                Math.max(1, (shareholder.shares || 10) - 1)
                              )}
                              disabled={(shareholder.shares || 10) <= 1}
                            >
                              -
                            </Button>
                          </div>
                        </td>
                        <td className="p-2">{shareholder.percentage}%</td>
                        <td className="p-2">{shareholder.profit?.toFixed(2) || "0.00"} грн</td>
                        <td className="p-2">
                          <Button variant="outline" size="sm" className="mr-2">
                            <PenLine className="h-4 w-4 mr-1" /> Деталі
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-2 text-center text-muted-foreground">
                        Немає зареєстрованих акціонерів
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
