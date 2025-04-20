
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, PiggyBank, DollarSign } from "lucide-react";
import { useMemo } from "react";

interface ShareholderSectionProps {
  user: {
    shares?: number;
    percentage?: number;
    profit?: number;
    title?: string;
  };
}

export function ShareholderSection({ user }: ShareholderSectionProps) {
  // Визначаємо титул на основі відсотка акцій
  const shareholderTitle = useMemo(() => {
    const percentage = user?.percentage || 0;
    
    if (percentage === 100) return "Імператор";
    if (percentage >= 76) return "Герцог";
    if (percentage >= 51) return "Лорд";
    if (percentage >= 36) return "Маркіз";
    if (percentage >= 21) return "Граф";
    if (percentage >= 11) return "Барон";
    if (percentage >= 6) return "Магнат";
    if (percentage >= 1) return "Акціонер";
    
    return "Акціонер";
  }, [user?.percentage]);

  // Визначаємо варіант беджа на основі титулу
  const getBadgeVariant = () => {
    // Використовуємо тільки допустимі варіанти для Badge
    switch(shareholderTitle) {
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Інформація акціонера
        </CardTitle>
        <Badge variant={getBadgeVariant()} className="text-lg px-3 py-1">
          {user.title || shareholderTitle}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Кількість акцій</p>
                  <h3 className="text-2xl font-bold mt-1">{user.shares || 0}</h3>
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
                  <h3 className="text-2xl font-bold mt-1">{user.percentage || 0}%</h3>
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
                  <h3 className="text-2xl font-bold mt-1">{user.profit?.toFixed(2) || 0} грн</h3>
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
