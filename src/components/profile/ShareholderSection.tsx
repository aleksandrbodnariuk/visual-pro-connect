
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, PiggyBank, DollarSign } from "lucide-react";

interface ShareholderSectionProps {
  user: {
    shares?: number;
    percentage?: number;
    profit?: number;
    title?: string;
  };
}

export function ShareholderSection({ user }: ShareholderSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Інформація акціонера
        </CardTitle>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {user.title || "Магнат"}
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
        </div>
      </CardContent>
    </Card>
  );
}
