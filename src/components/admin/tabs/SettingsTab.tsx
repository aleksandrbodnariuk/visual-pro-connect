
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { LogoUpload } from "@/components/settings/LogoUpload";
import { supabase } from "@/integrations/supabase/client";

export function SettingsTab() {
  const [settings, setSettings] = useState({
    siteName: localStorage.getItem("siteName") || "Спільнота B&C",
    allowRegistration: localStorage.getItem("allowRegistration") !== "false",
    enableNotifications: localStorage.getItem("enableNotifications") !== "false",
    maintenanceMode: localStorage.getItem("maintenanceMode") === "true"
  });

  // Перевіряємо і створюємо bucket для зберігання логотипів і банерів
  useEffect(() => {
    const checkAndCreateBuckets = async () => {
      try {
        // Перевіряємо існування бакета logos
        const { data: logosBucket, error: logosError } = await supabase
          .storage
          .getBucket('logos');
          
        if (logosError && !logosError.message.includes('does not exist')) {
          console.error("Error checking logos bucket:", logosError);
        }
        
        // Якщо бакет не існує, створюємо його
        if (!logosBucket) {
          const { error: createLogosError } = await supabase
            .storage
            .createBucket('logos', {
              public: true
            });
            
          if (createLogosError) {
            console.error("Error creating logos bucket:", createLogosError);
          } else {
            console.log("Created logos bucket");
          }
        }
        
        // Перевіряємо існування бакета banners
        const { data: bannersBucket, error: bannersError } = await supabase
          .storage
          .getBucket('banners');
          
        if (bannersError && !bannersError.message.includes('does not exist')) {
          console.error("Error checking banners bucket:", bannersError);
        }
        
        // Якщо бакет не існує, створюємо його
        if (!bannersBucket) {
          const { error: createBannersError } = await supabase
            .storage
            .createBucket('banners', {
              public: true
            });
            
          if (createBannersError) {
            console.error("Error creating banners bucket:", createBannersError);
          } else {
            console.log("Created banners bucket");
          }
        }
        
        // Перевіряємо існування бакета avatars
        const { data: avatarsBucket, error: avatarsError } = await supabase
          .storage
          .getBucket('avatars');
          
        if (avatarsError && !avatarsError.message.includes('does not exist')) {
          console.error("Error checking avatars bucket:", avatarsError);
        }
        
        // Якщо бакет не існує, створюємо його
        if (!avatarsBucket) {
          const { error: createAvatarsError } = await supabase
            .storage
            .createBucket('avatars', {
              public: true
            });
            
          if (createAvatarsError) {
            console.error("Error creating avatars bucket:", createAvatarsError);
          } else {
            console.log("Created avatars bucket");
          }
        }
        
      } catch (error) {
        console.error("Error checking buckets:", error);
      }
    };
    
    checkAndCreateBuckets();
  }, []);

  const saveSettings = () => {
    localStorage.setItem("siteName", settings.siteName);
    localStorage.setItem("allowRegistration", settings.allowRegistration.toString());
    localStorage.setItem("enableNotifications", settings.enableNotifications.toString());
    localStorage.setItem("maintenanceMode", settings.maintenanceMode.toString());
    
    // Додамо декілька демо-користувачів для розділу "Знайти контакти"
    const existingUsers = JSON.parse(localStorage.getItem("users") || "[]");
    
    // Перевіримо, чи вже є користувачі з професійними категоріями
    const hasProfessionalUsers = existingUsers.some((user: any) => 
      user.categories && user.categories.length > 0 && 
      (user.categories.includes('photographer') || 
       user.categories.includes('videographer') || 
       user.categories.includes('musician'))
    );
    
    // Якщо професійних користувачів немає, додамо їх
    if (!hasProfessionalUsers) {
      const professionalUsers = [
        {
          id: "pro1",
          firstName: "Олександр",
          lastName: "Петренко",
          phoneNumber: "0971234567",
          password: "password123",
          avatarUrl: "https://i.pravatar.cc/150?img=1",
          categories: ["photographer"],
          bio: "Професійний фотограф з 10-річним досвідом. Спеціалізуюсь на весільній та комерційній фотографії.",
          city: "Київ",
          country: "Україна",
          instagram: "alex_photo",
          facebook: "alex.photo",
          isShareHolder: true
        },
        {
          id: "pro2",
          firstName: "Марія",
          lastName: "Коваленко",
          phoneNumber: "0982345678",
          password: "password123",
          avatarUrl: "https://i.pravatar.cc/150?img=5",
          categories: ["videographer"],
          bio: "Відеограф. Створюю емоційні відео для весіль, бізнесу та особистих проектів.",
          city: "Львів",
          country: "Україна",
          instagram: "maria_video",
          facebook: "maria.videography",
          isShareHolder: true
        },
        {
          id: "pro3",
          firstName: "Іван",
          lastName: "Шевченко",
          phoneNumber: "0993456789",
          password: "password123",
          avatarUrl: "https://i.pravatar.cc/150?img=8",
          categories: ["musician"],
          bio: "Музикант, DJ. Забезпечу чудовий музичний супровід для вашого свята.",
          city: "Одеса",
          country: "Україна",
          instagram: "ivan_music",
          facebook: "ivan.music.dj",
          isShareHolder: false
        },
        {
          id: "pro4",
          firstName: "Наталія",
          lastName: "Мельник",
          phoneNumber: "0964567890",
          password: "password123",
          avatarUrl: "https://i.pravatar.cc/150?img=9",
          categories: ["host"],
          bio: "Ведуча свят з 10-річним досвідом. Проведу ваше свято на найвищому рівні.",
          city: "Харків",
          country: "Україна",
          instagram: "natali_host",
          facebook: "natali.events",
          isShareHolder: false
        },
        {
          id: "pro5",
          firstName: "Сергій",
          lastName: "Бондаренко",
          phoneNumber: "0975678901",
          password: "password123",
          avatarUrl: "https://i.pravatar.cc/150?img=12",
          categories: ["pyrotechnician"],
          bio: "Піротехнік. Створюю незабутні фаєр-шоу та феєрверки для будь-яких подій.",
          city: "Дніпро",
          country: "Україна",
          instagram: "sergey_fire",
          facebook: "sergey.pyro",
          isShareHolder: false
        }
      ];
      
      const updatedUsers = [...existingUsers, ...professionalUsers];
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    }
    
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
      <LogoUpload />
      
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
