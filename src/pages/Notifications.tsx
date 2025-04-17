
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Bell, Calendar, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // В реальному додатку тут має бути запит до API
    const storedNotifications = localStorage.getItem("notifications");
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    } else {
      // Демонстраційні дані
      const demoNotifications = [
        {
          id: "1",
          type: "info",
          title: "Ласкаво просимо до Спільноти B&C!",
          message: "Дякуємо за реєстрацію. Заповніть свій профіль, щоб почати користуватися всіма можливостями платформи.",
          date: new Date().toISOString(),
          read: false,
        },
        {
          id: "2",
          type: "success",
          title: "Ваша публікація успішно розміщена",
          message: "Ваша публікація тепер доступна в стрічці та профілі.",
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
        },
        {
          id: "3",
          type: "warning",
          title: "Нове повідомлення щодо замовлення",
          message: "У вас є непрочитане повідомлення щодо вашого замовлення.",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          read: false,
        },
      ];
      setNotifications(demoNotifications);
      localStorage.setItem("notifications", JSON.stringify(demoNotifications));
    }
  }, []);

  const markAsRead = (id: string) => {
    const updatedNotifications = notifications.map((notification) => {
      if (notification.id === id) {
        return { ...notification, read: true };
      }
      return notification;
    });
    setNotifications(updatedNotifications);
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      read: true,
    }));
    setNotifications(updatedNotifications);
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden lg:block col-span-3" />
        
        <main className="col-span-12 lg:col-span-9">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold">Сповіщення</h1>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-3">
                  {unreadCount} нових
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                Позначити всі як прочитані
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-colors ${!notification.read ? "border-l-4 border-l-primary" : ""}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-lg">{notification.title}</h3>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-muted-foreground">
                              {new Date(notification.date).toLocaleDateString()}
                            </span>
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => markAsRead(notification.id)}
                              >
                                Прочитано
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground">{notification.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 border rounded-lg bg-muted/30">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="text-xl font-medium mb-2">Немає сповіщень</h3>
                <p className="text-muted-foreground">
                  Тут будуть відображатися ваші сповіщення
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
