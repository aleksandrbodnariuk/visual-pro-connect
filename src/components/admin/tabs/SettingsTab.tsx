
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

export function SettingsTab() {
  const [settings, setSettings] = useState({
    siteName: localStorage.getItem("siteName") || "Спільнота B&C",
    allowRegistration: localStorage.getItem("allowRegistration") !== "false",
    enableNotifications: localStorage.getItem("enableNotifications") !== "false",
    maintenanceMode: localStorage.getItem("maintenanceMode") === "true"
  });

  const saveSettings = () => {
    localStorage.setItem("siteName", settings.siteName);
    localStorage.setItem("allowRegistration", settings.allowRegistration.toString());
    localStorage.setItem("enableNotifications", settings.enableNotifications.toString());
    localStorage.setItem("maintenanceMode", settings.maintenanceMode.toString());
    
    toast.success("Налаштування збережено");
  };

  const resetSettings = () => {
    const defaultSettings = {
      siteName: "Спільнота B&C",
      allowRegistration: true,
      enableNotifications: true,
      maintenanceMode: false
    };
    
    setSettings(defaultSettings);
    localStorage.setItem("siteName", defaultSettings.siteName);
    localStorage.setItem("allowRegistration", defaultSettings.allowRegistration.toString());
    localStorage.setItem("enableNotifications", defaultSettings.enableNotifications.toString());
    localStorage.setItem("maintenanceMode", defaultSettings.maintenanceMode.toString());
    
    toast.success("Налаштування скинуто до стандартних");
  };

  const exportData = () => {
    const data = {
      users: JSON.parse(localStorage.getItem("users") || "[]"),
      orders: JSON.parse(localStorage.getItem("orders") || "[]"),
      archivedOrders: JSON.parse(localStorage.getItem("archivedOrders") || "[]"),
      posts: JSON.parse(localStorage.getItem("posts") || "[]"),
      stockExchange: JSON.parse(localStorage.getItem("stockExchange") || "[]"),
      sharesTransactions: JSON.parse(localStorage.getItem("sharesTransactions") || "[]"),
      settings: {
        siteName: settings.siteName,
        allowRegistration: settings.allowRegistration,
        enableNotifications: settings.enableNotifications,
        maintenanceMode: settings.maintenanceMode,
        stockPrice: localStorage.getItem("stockPrice") || "1000"
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `bc-community-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success("Дані експортовано");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Загальні налаштування</CardTitle>
          <CardDescription>Управління основними параметрами системи</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="site-name">Назва сайту</Label>
              <Input 
                id="site-name" 
                value={settings.siteName}
                onChange={(e) => setSettings({...settings, siteName: e.target.value})}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium">Дозволити реєстрацію</h3>
                <p className="text-sm text-muted-foreground">
                  Нові користувачі зможуть реєструватися на сайті
                </p>
              </div>
              <Switch 
                checked={settings.allowRegistration}
                onCheckedChange={(checked) => setSettings({...settings, allowRegistration: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium">Увімкнути сповіщення</h3>
                <p className="text-sm text-muted-foreground">
                  Повідомлення для користувачів про події системи
                </p>
              </div>
              <Switch 
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({...settings, enableNotifications: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium">Режим обслуговування</h3>
                <p className="text-sm text-muted-foreground">
                  Сайт буде доступний тільки для адміністраторів
                </p>
              </div>
              <div className="flex items-center">
                {settings.maintenanceMode && (
                  <Badge variant="outline" className="mr-2">Активний</Badge>
                )}
                <Switch 
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetSettings}>
                <RefreshCw className="mr-2 h-4 w-4" /> Скинути
              </Button>
              <Button onClick={saveSettings}>
                <Save className="mr-2 h-4 w-4" /> Зберегти
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Експорт даних</CardTitle>
          <CardDescription>Збереження даних системи в JSON форматі</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportData}>
            <FileText className="mr-2 h-4 w-4" /> Експортувати дані
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
