
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stockPrice, setStockPrice] = useState("1000");
  
  const navigate = useNavigate();
  
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    
    // Перевірка на права доступу
    if (!currentUser || !(currentUser.isAdmin || currentUser.role === "admin" || currentUser.role === "admin-founder")) {
      toast.error("Доступ заборонено: Необхідні права адміністратора");
      navigate("/auth");
      return;
    }
    
    // Встановлюємо статус адміністратора
    setIsAdmin(true);
    
    // Перевіряємо, чи це засновник
    const isFounderAdmin = currentUser.role === "admin-founder" || 
                          (currentUser.phoneNumber === "0507068007" && currentUser.isFounder);
    setIsFounder(isFounderAdmin);
    
    // Оновлюємо роль користувача, якщо він має номер засновника
    if (currentUser.phoneNumber === "0507068007" && !isFounderAdmin) {
      const updatedUser = {
        ...currentUser,
        isAdmin: true,
        isFounder: true,
        role: "admin-founder",
        isShareHolder: true
      };
      
      // Оновлюємо дані в localStorage
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      
      // Оновлюємо список користувачів
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const updatedUsers = storedUsers.map((user: any) => {
        if (user.phoneNumber === "0507068007" || user.id === currentUser.id) {
          return {
            ...user,
            isAdmin: true,
            isFounder: true,
            role: "admin-founder",
            isShareHolder: true,
            status: "Адміністратор-засновник"
          };
        }
        return user;
      });
      
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      
      // Оновлюємо стан
      setIsFounder(true);
    }
    
    // Завантажуємо усіх користувачів
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    setUsers(storedUsers);
    
    // Фільтруємо акціонерів
    const shareholdersData = storedUsers.filter((user: any) => 
      user.isShareHolder === true || user.status === "Акціонер" || user.role === "shareholder"
    );
    setShareholders(shareholdersData);
    
    // Завантажуємо замовлення
    const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    setOrders(storedOrders);
    
    // Встановлюємо ціну акцій
    const storedStockPrice = localStorage.getItem("stockPrice");
    if (storedStockPrice) {
      setStockPrice(storedStockPrice);
    } else {
      localStorage.setItem("stockPrice", stockPrice);
    }
  }, [navigate, stockPrice]);

  if (!isAdmin) {
    return <div className="container py-16 text-center">Перевірка прав доступу...</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Панель адміністратора</h1>
          <p className="text-muted-foreground">Управління сайтом Спільнота B&C</p>
          
          {isFounder && (
            <Badge variant="secondary" className="mt-2">
              Адміністратор-засновник
            </Badge>
          )}
        </div>
        
        <AdminStats 
          users={users.length}
          shareholders={shareholders.length}
          orders={orders.length}
          stockPrice={stockPrice}
        />
        
        <AdminTabs />
      </div>
    </div>
  );
}
