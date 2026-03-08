
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, PiggyBank, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

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
  const [shareholderData, setShareholderData] = useState({
    shares: user?.shares || 0,
    percentage: user?.percentage || 0,
    profit: user?.profit || 0,
    title: user?.title || "Акціонер"
  });
  
  useEffect(() => {
    const loadShareholderData = async () => {
      if (!user?.id || !user?.isShareHolder || settingsLoading) return;
      
      try {
        const { data: sharesData, error: sharesError } = await supabase
          .from('shares')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (sharesError && sharesError.code !== 'PGRST116') {
          console.error("Помилка при отриманні даних акцій:", sharesError);
        }
        
        let shares = user.shares || 0;
        let percentage = user.percentage || 0;
        
        if (sharesData) {
          shares = sharesData.quantity;
          percentage = totalShares > 0 ? (shares / totalShares) * 100 : 0;
        } else if (user.shares && user.shares > 0) {
          const { error: insertError } = await supabase
            .from('shares')
            .insert({ user_id: user.id, quantity: user.shares });
          if (insertError) {
            console.error("Помилка при створенні запису акцій:", insertError);
          }
        } else if (user.isShareHolder) {
          shares = 10;
          percentage = totalShares > 0 ? (shares / totalShares) * 100 : 0;
          
          const { error: insertError } = await supabase
            .from('shares')
            .insert({ user_id: user.id, quantity: shares });
          if (insertError) {
            console.error("Помилка при створенні запису акцій:", insertError);
          }
        }
        
        const title = determineShareholderTitle(percentage);
        
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
  }, [user, totalShares, settingsLoading]);

  const determineShareholderTitle = (percentage: number): string => {
    if (percentage === 100) return "Імператор";
    if (percentage >= 50) return "Герцог";
    if (percentage >= 40) return "Лорд";
    if (percentage >= 30) return "Маркіз";
    if (percentage >= 20) return "Граф";
    if (percentage >= 10) return "Барон";
    if (percentage >= 5) return "Магнат";
    if (percentage >= 1) return "Акціонер";
    return "Акціонер";
  };

  const getBadgeVariant = () => {
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
                  <h3 className="text-2xl font-bold mt-1">{shareholderData.profit.toFixed(2)} USD</h3>
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
            Поточна ціна акції: {sharePriceUsd} USD.
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
