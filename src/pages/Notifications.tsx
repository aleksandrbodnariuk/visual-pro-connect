
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Bell, Calendar, Info, CheckCircle, AlertTriangle, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      // Використовуємо Supabase Auth як єдине джерело правди
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Get notifications from Supabase
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching notifications from Supabase:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        setNotifications(data);
        return;
      }
      
      // Fallback to localStorage if no data in Supabase
      const storedNotifications = localStorage.getItem("notifications");
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      
      // Final fallback to localStorage
      const storedNotifications = localStorage.getItem("notifications");
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      } else {
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      // Try to update in Supabase first
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
        
      if (error) {
        console.error("Error updating notification in Supabase:", error);
      }
      
      // Update local state
      const updatedNotifications = notifications.map((notification) => {
        if (notification.id === id) {
          return { ...notification, is_read: true };
        }
        return notification;
      });
      
      setNotifications(updatedNotifications);
      
      // Update localStorage
      localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Не вдалося позначити сповіщення як прочитане");
    }
  };

  const markAllAsRead = async () => {
    try {
      // Використовуємо Supabase Auth як єдине джерело правди
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
          
        if (error) {
          console.error("Error updating all notifications in Supabase:", error);
        }
      }
      
      // Update local state
      const updatedNotifications = notifications.map((notification) => ({
        ...notification,
        is_read: true
      }));
      
      setNotifications(updatedNotifications);
      
      // Update localStorage
      localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
      
      toast.success("Всі сповіщення позначено як прочитані");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Не вдалося позначити всі сповіщення як прочитані");
    }
  };
  
  const deleteNotification = async (id: string) => {
    try {
      // Try to delete from Supabase first
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting notification from Supabase:", error);
      }
      
      // Update local state
      const updatedNotifications = notifications.filter(
        (notification) => notification.id !== id
      );
      
      setNotifications(updatedNotifications);
      
      // Update localStorage
      localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
      
      toast.success("Сповіщення видалено");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Не вдалося видалити сповіщення");
    }
  };
  
  const deleteAllNotifications = async () => {
    try {
      // Використовуємо Supabase Auth як єдине джерело правди
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id);
          
        if (error) {
          console.error("Error deleting all notifications from Supabase:", error);
        }
      }
      
      // Clear local state
      setNotifications([]);
      
      // Update localStorage
      localStorage.setItem("notifications", JSON.stringify([]));
      
      toast.success("Всі сповіщення видалено");
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      toast.error("Не вдалося видалити всі сповіщення");
    }
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

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <div className="flex flex-col items-center justify-center">
            <Bell className="h-10 w-10 text-muted-foreground animate-pulse mb-4" />
            <p>Завантаження сповіщень...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-nav">
      <Navbar />
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden md:block md:col-span-4 lg:col-span-3" />
        
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold">Сповіщення</h1>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-3">
                  {unreadCount} нових
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <Button variant="outline" onClick={markAllAsRead}>
                  Позначити всі як прочитані
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="destructive" onClick={deleteAllNotifications}>
                  <Trash className="h-4 w-4 mr-1" /> Видалити всі
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-colors ${!notification.is_read ? "border-l-4 border-l-primary" : ""}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type || "info")}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-lg">{notification.title || notification.type || "Сповіщення"}</h3>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-muted-foreground">
                              {new Date(notification.created_at || notification.date).toLocaleDateString()}
                            </span>
                            <div className="flex space-x-2">
                              {!notification.is_read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  Прочитано
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{notification.message || notification.content}</p>
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
