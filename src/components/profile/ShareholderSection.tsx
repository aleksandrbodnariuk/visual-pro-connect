
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, PiggyBank, DollarSign } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [shareholderData, setShareholderData] = useState({
    shares: user?.shares || 0,
    percentage: user?.percentage || 0,
    profit: user?.profit || 0,
    title: user?.title || "Акціонер"
  });
  
  useEffect(() => {
    const loadShareholderData = async () => {
      if (!user?.id || !user?.isShareHolder) return;
      
      try {
        // Спочатку перевіряємо наявність даних в таблиці shares
        const { data: sharesData, error: sharesError } = await supabase
          .from('shares')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (sharesError && sharesError.code !== 'PGRST116') {
          console.error("Помилка при отриманні даних акцій:", sharesError);
          return;
        }
        
        // Отримуємо загальну кількість акцій для розрахунку відсотка
        const totalSharesStr = localStorage.getItem("totalShares") || "1000";
        const totalShares = parseInt(totalSharesStr) || 1000;
        
        let shares = user.shares || 0;
        let percentage = user.percentage || 0;
        
        // Якщо є дані в Supabase, використовуємо їх
        if (sharesData) {
          shares = sharesData.quantity;
          percentage = totalShares > 0 ? (shares / totalShares) * 100 : 0;
        } 
        // Якщо даних немає в Supabase, але є в user, створюємо запис
        else if (user.shares && user.shares > 0) {
          const { error: insertError } = await supabase
            .from('shares')
            .insert({
              user_id: user.id,
              quantity: user.shares
            });
            
          if (insertError) {
            console.error("Помилка при створенні запису акцій:", insertError);
          }
        } 
        // Якщо даних немає взагалі, створюємо запис з 10 акціями за замовчуванням
        else if (user.isShareHolder) {
          shares = 10;
          percentage = totalShares > 0 ? (shares / totalShares) * 100 : 0;
          
          const { error: insertError } = await supabase
            .from('shares')
            .insert({
              user_id: user.id,
              quantity: shares
            });
            
          if (insertError) {
            console.error("Помилка при створенні запису акцій:", insertError);
          } else {
            // Оновлюємо локальні дані користувача
            const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
            if (currentUser.id === user.id) {
              currentUser.shares = shares;
              currentUser.percentage = percentage;
              localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }
          }
        }
        
        // Визначаємо титул на основі відсотка акцій
        const title = determineShareholderTitle(percentage);
        
        // Оновлюємо стан компонента
        setShareholderData({
          shares,
          percentage,
          profit: user.profit || 0,
          title: user.title || title
        });
      } catch (error) {
        console.error("Помилка при завантаженні даних акціонера:", error);
        toast.error("Не вдалося завантажити дані акціонера");
      }
    };
    
    loadShareholderData();
  }, [user]);

  // Визначаємо титул на основі відсотка акцій
  const determineShareholderTitle = (percentage: number): string => {
    if (percentage === 100) return "Імператор";
    if (percentage >= 76) return "Герцог";
    if (percentage >= 51) return "Лорд";
    if (percentage >= 36) return "Маркіз";
    if (percentage >= 21) return "Граф";
    if (percentage >= 11) return "Барон";
    if (percentage >= 6) return "Магнат";
    if (percentage >= 1) return "Акціонер";
    
    return "Акціонер";
  };

  // Визначаємо варіант беджа на основі титулу
  const getBadgeVariant = () => {
    // Використовуємо тільки допустимі варіанти для Badge
    switch(shareholderData.title) {
      case "Імператор": return "destructive" as const;
      case "Герцог": return "secondary" as const;
      case "Лорд": return "default" as const;
      case "Маркіз": return "secondary" as const;
      case "Граф": return "default" as const;
      case "Барон": return "secondary" as const;
      case "Магнат": return "outline" as const;
      default: return "outline" as const;
    }
  };

  // Якщо користувач не є акціонером, не відображаємо секцію
  if (!user?.isShareHolder) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Інформація акціонера
        </CardTitle>
        <Badge variant={getBadgeVariant()} className="text-lg px-3 py-1">
          {shareholderData.title}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Кількість акцій</p>
                  <h3 className="text-2xl font-bold mt-1">{shareholderData.shares}</h3>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-700">
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
                  <h3 className="text-2xl font-bold mt-1">{shareholderData.percentage.toFixed(2)}%</h3>
                </div>
                <div className="p-3 rounded-full bg-amber-100 text-amber-700">
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
                  <h3 className="text-2xl font-bold mt-1">{shareholderData.profit.toFixed(2)} грн</h3>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-700">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="border rounded-md p-4">
          <h3 className="font-semibold mb-2">Інформація про ринок акцій</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Як акціонер компанії, ви маєте доступ до ринку акцій, де можете купувати та продавати акції.
            Поточна рекомендована ціна акції: {localStorage.getItem("stockPrice") || "1000"} грн.
          </p>
          <p className="text-sm text-muted-foreground">
            Прибуток з кожного замовлення розподіляється між акціонерами відповідно до відсотка акцій.
            45% від суми кожного замовлення розподіляється між акціонерами.
          </p>
          
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium mb-2">Система титулів</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">1-5%:</span> Акціонер
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">6-10%:</span> Магнат
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">11-20%:</span> Барон
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">21-35%:</span> Граф
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">36-50%:</span> Маркіз
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">51-75%:</span> Лорд
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">76-99%:</span> Герцог
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="font-semibold">100%:</span> Імператор
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
