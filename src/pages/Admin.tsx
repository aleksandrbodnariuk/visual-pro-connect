
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const { tabName } = useParams<{ tabName: string }>();
  
  const loadUsersData = () => {
    // Завантажуємо користувачів
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    console.log("Завантажені користувачі:", storedUsers);
    setUsers(storedUsers);
    
    // Фільтруємо акціонерів - тільки ті, хто має is_shareholder: true або є засновником
    const shareholdersData = storedUsers.filter((user: any) => {
      const isFounder = user.founder_admin || user.phone_number === '0507068007';
      const isShareholder = user.is_shareholder === true || user.isShareHolder === true;
      const result = isFounder || isShareholder;
      console.log(`Користувач ${user.full_name || user.firstName}: isFounder=${isFounder}, is_shareholder=${user.is_shareholder}, isShareHolder=${user.isShareHolder}, result=${result}`);
      return result;
    });
    
    console.log("Відфільтровані акціонери:", shareholdersData);
    setShareholders(shareholdersData);
  };

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
                          (currentUser.phoneNumber === "0507068007" && currentUser.isFounder) ||
                          currentUser.phone_number === "0507068007";
    setIsFounder(isFounderAdmin);
    
    // Оновлюємо роль користувача, якщо він має номер засновника
    if ((currentUser.phoneNumber === "0507068007" || currentUser.phone_number === "0507068007") && !isFounderAdmin) {
      const updatedUser = {
        ...currentUser,
        isAdmin: true,
        isFounder: true,
        role: "admin-founder",
        isShareHolder: true,
        is_shareholder: true
      };
      
      // Оновлюємо дані в localStorage
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      
      // Оновлюємо список користувачів
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const updatedUsers = storedUsers.map((user: any) => {
        if (user.phoneNumber === "0507068007" || user.phone_number === "0507068007" || user.id === currentUser.id) {
          return {
            ...user,
            isAdmin: true,
            isFounder: true,
            role: "admin-founder",
            isShareHolder: true,
            is_shareholder: true,
            founder_admin: true,
            is_admin: true,
            status: "Адміністратор-засновник"
          };
        }
        return user;
      });
      
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      
      // Оновлюємо стан
      setIsFounder(true);
    }
    
    // Якщо не вказано вкладку, перенаправляємо на вкладку "users"
    if (!tabName) {
      navigate("/admin/users");
    }
    
    // Завантажуємо дані користувачів
    loadUsersData();
    
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

    // Слухач для оновлення статистики при зміні статусу акціонера
    const handleShareholderUpdate = () => {
      console.log("Отримано подію оновлення акціонера, перезавантажуємо дані...");
      loadUsersData();
    };

    window.addEventListener('shareholder-status-updated', handleShareholderUpdate);
    window.addEventListener('storage', loadUsersData);

    return () => {
      window.removeEventListener('shareholder-status-updated', handleShareholderUpdate);
      window.removeEventListener('storage', loadUsersData);
    };
  }, [navigate, stockPrice, tabName]);

  if (!isAdmin) {
    return <div className="container py-16 text-center">Перевірка прав доступу...</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Панель адміністратора</h1>
            <p className="text-muted-foreground">Управління сайтом Спільнота B&C</p>
            
            {isFounder && (
              <Badge variant="secondary" className="mt-2">
                Адміністратор-засновник
              </Badge>
            )}
          </div>
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
