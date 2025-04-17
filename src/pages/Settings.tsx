
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Lock, Bell, Eye, Moon, Shield, LogOut } from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("currentUser");
    return storedUser ? JSON.parse(storedUser) : {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      bio: "",
      profession: "",
      avatarUrl: "",
    };
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    orderNotifications: true,
  });

  const [appearance, setAppearance] = useState({
    darkMode: false,
    highContrast: false,
    fontSize: "normal",
    reducedMotion: false,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const saveProfile = () => {
    localStorage.setItem("currentUser", JSON.stringify(user));
    toast.success("Профіль успішно оновлено");
  };

  const changePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Заповніть всі поля");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Нові паролі не співпадають");
      return;
    }
    
    toast.success("Пароль успішно змінено");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const saveNotifications = () => {
    localStorage.setItem("userNotificationSettings", JSON.stringify(notifications));
    toast.success("Налаштування сповіщень збережено");
  };

  const saveAppearance = () => {
    localStorage.setItem("userAppearanceSettings", JSON.stringify(appearance));
    toast.success("Налаштування зовнішнього вигляду збережено");
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden lg:block col-span-3" />
        
        <main className="col-span-12 lg:col-span-9">
          <h1 className="text-3xl font-bold mb-6">Налаштування</h1>
          
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Профіль
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="h-4 w-4 mr-2" />
                Безпека
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Сповіщення
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Eye className="h-4 w-4 mr-2" />
                Зовнішній вигляд
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Інформація профілю</CardTitle>
                  <CardDescription>
                    Редагуйте свої особисті дані та професійну інформацію
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-lg">{user.firstName} {user.lastName}</h3>
                      <p className="text-muted-foreground">{user.profession || "Учасник спільноти"}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Змінити фото
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="first-name">Ім'я</Label>
                      <Input 
                        id="first-name" 
                        value={user.firstName || ""} 
                        onChange={(e) => setUser({...user, firstName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last-name">Прізвище</Label>
                      <Input 
                        id="last-name" 
                        value={user.lastName || ""} 
                        onChange={(e) => setUser({...user, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Номер телефону</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      value={user.phoneNumber || ""} 
                      onChange={(e) => setUser({...user, phoneNumber: e.target.value})}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Номер телефону не можна змінити (використовується для входу)
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="profession">Професія</Label>
                    <Input 
                      id="profession" 
                      value={user.profession || ""} 
                      onChange={(e) => setUser({...user, profession: e.target.value})}
                      placeholder="Наприклад: Фотограф, Відеограф, Музикант..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bio">Про себе</Label>
                    <Textarea 
                      id="bio" 
                      value={user.bio || ""} 
                      onChange={(e) => setUser({...user, bio: e.target.value})}
                      placeholder="Розкажіть коротко про свій досвід та послуги"
                      rows={4}
                    />
                  </div>
                  
                  <Button onClick={saveProfile}>Зберегти зміни</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Безпека та вхід</CardTitle>
                  <CardDescription>
                    Керуйте своїм паролем та налаштуваннями безпеки
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Зміна паролю</h3>
                    
                    <div>
                      <Label htmlFor="current-password">Поточний пароль</Label>
                      <Input 
                        id="current-password" 
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="new-password">Новий пароль</Label>
                      <Input 
                        id="new-password" 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirm-password">Підтвердіть новий пароль</Label>
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    
                    <Button onClick={changePassword}>Змінити пароль</Button>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium text-lg">Вихід з облікового запису</h3>
                    <p className="text-muted-foreground">
                      Натисніть кнопку нижче, щоб вийти з усіх пристроїв.
                    </p>
                    <Button variant="destructive" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Вийти з облікового запису
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Налаштування сповіщень</CardTitle>
                  <CardDescription>
                    Налаштуйте, які сповіщення ви бажаєте отримувати
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">Email сповіщення</Label>
                        <p className="text-sm text-muted-foreground">
                          Отримувати сповіщення на електронну пошту
                        </p>
                      </div>
                      <Switch 
                        id="email-notifications" 
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, emailNotifications: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notifications">Push-сповіщення</Label>
                        <p className="text-sm text-muted-foreground">
                          Отримувати push-сповіщення в браузері
                        </p>
                      </div>
                      <Switch 
                        id="push-notifications" 
                        checked={notifications.pushNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, pushNotifications: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="message-notifications">Повідомлення</Label>
                        <p className="text-sm text-muted-foreground">
                          Сповіщення про нові повідомлення
                        </p>
                      </div>
                      <Switch 
                        id="message-notifications" 
                        checked={notifications.messageNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, messageNotifications: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="order-notifications">Замовлення</Label>
                        <p className="text-sm text-muted-foreground">
                          Сповіщення про нові та оновлені замовлення
                        </p>
                      </div>
                      <Switch 
                        id="order-notifications" 
                        checked={notifications.orderNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({...notifications, orderNotifications: checked})
                        }
                      />
                    </div>
                  </div>
                  
                  <Button onClick={saveNotifications}>Зберегти налаштування</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Зовнішній вигляд</CardTitle>
                  <CardDescription>
                    Налаштуйте вигляд додатку під свої потреби
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dark-mode">Темна тема</Label>
                        <p className="text-sm text-muted-foreground">
                          Перемкнути на темний режим
                        </p>
                      </div>
                      <Switch 
                        id="dark-mode" 
                        checked={appearance.darkMode}
                        onCheckedChange={(checked) => 
                          setAppearance({...appearance, darkMode: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="high-contrast">Високий контраст</Label>
                        <p className="text-sm text-muted-foreground">
                          Підвищити контрастність інтерфейсу
                        </p>
                      </div>
                      <Switch 
                        id="high-contrast" 
                        checked={appearance.highContrast}
                        onCheckedChange={(checked) => 
                          setAppearance({...appearance, highContrast: checked})
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="reduced-motion">Зменшення анімацій</Label>
                        <p className="text-sm text-muted-foreground">
                          Зменшити або вимкнути анімації інтерфейсу
                        </p>
                      </div>
                      <Switch 
                        id="reduced-motion" 
                        checked={appearance.reducedMotion}
                        onCheckedChange={(checked) => 
                          setAppearance({...appearance, reducedMotion: checked})
                        }
                      />
                    </div>
                  </div>
                  
                  <Button onClick={saveAppearance}>Зберегти налаштування</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
