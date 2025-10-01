
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stockPrice, setStockPrice] = useState("1000");
  
  const navigate = useNavigate();
  const { tabName } = useParams<{ tabName: string }>();
  const { getCurrentUser, isAuthenticated, loading } = useSupabaseAuth();
  const currentUser = getCurrentUser();
  
  const loadUsersData = async () => {
    try {
      // Загружаем пользователей из Supabase
      const { data, error } = await supabase.rpc('get_users_for_admin');
      if (error) {
        console.error('Error loading users from Supabase:', error);
        return;
      }
      
      console.log("Загруженные пользователи из Supabase:", data);
      setUsers(data || []);
      
      // Фильтруем акционеров
      const shareholdersData = (data || []).filter((user: any) => {
        const isFounder = user.founder_admin || user.phone_number === '0507068007';
        const isShareholder = user.is_shareholder === true;
        const result = isFounder || isShareholder;
        console.log(`Пользователь ${user.full_name}: isFounder=${isFounder}, is_shareholder=${user.is_shareholder}, result=${result}`);
        return result;
      });
      
      console.log("Отфильтрованные акционеры:", shareholdersData);
      setShareholders(shareholdersData);
    } catch (error) {
      console.error('Error in loadUsersData:', error);
    }
  };

  useEffect(() => {
    // Проверяем аутентификацию и права доступа
    console.log('👨‍💼 Admin page: checking auth...', { 
      loading, 
      isAuthenticated: isAuthenticated(), 
      currentUser: currentUser ? {
        id: currentUser.id,
        isAdmin: currentUser.isAdmin,
        founder_admin: currentUser.founder_admin
      } : null
    });
    
    if (loading) return;
    
    if (!isAuthenticated() || !currentUser) {
      console.log('❌ Admin access denied: no auth');
      toast.error("Доступ запрещен: Необходимо войти в систему");
      navigate("/auth");
      return;
    }
    
    if (!currentUser.isAdmin && !currentUser.founder_admin) {
      console.log('❌ Admin access denied: no admin rights', {
        isAdmin: currentUser.isAdmin,
        founder_admin: currentUser.founder_admin
      });
      toast.error("Доступ запрещен: Необходимы права администратора");
      navigate("/");
      return;
    }
    
    console.log('✅ Admin access granted');
    
    // Если не указана вкладка, перенаправляем на вкладку "users"
    if (!tabName) {
      navigate("/admin/users");
    }
    
    // Загружаем данные пользователей
    loadUsersData();
    
    // Загружаем заказы из localStorage (для совместимости)
    const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    setOrders(storedOrders);
    
    // Устанавливаем цену акций
    const storedStockPrice = localStorage.getItem("stockPrice");
    if (storedStockPrice) {
      setStockPrice(storedStockPrice);
    } else {
      localStorage.setItem("stockPrice", stockPrice);
    }

    // Слушатель для обновления статистики при изменении статуса акционера
    const handleShareholderUpdate = () => {
      console.log("Получено событие обновления акционера, перезагружаем данные...");
      loadUsersData();
    };

    window.addEventListener('shareholder-status-updated', handleShareholderUpdate);
    window.addEventListener('storage', loadUsersData);

    return () => {
      window.removeEventListener('shareholder-status-updated', handleShareholderUpdate);
      window.removeEventListener('storage', loadUsersData);
    };
  }, [navigate, stockPrice, tabName, loading, isAuthenticated, currentUser]);

  if (loading) {
    return <div className="container py-16 text-center">Загрузка...</div>;
  }

  // Show loading while user data is being fetched
  if (isAuthenticated() && !currentUser) {
    return <div className="container py-16 text-center">Завантаження даних користувача...</div>;
  }

  if (!isAuthenticated() || !currentUser) {
    return <div className="container py-16 text-center">Перенаправление на страницу авторизации...</div>;
  }

  if (!currentUser.isAdmin && !currentUser.founder_admin) {
    return <div className="container py-16 text-center">Доступ запрещен</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Панель администратора</h1>
            <p className="text-muted-foreground">Управление сайтом Спільнота B&C</p>
            
            {currentUser.founder_admin && (
              <Badge variant="secondary" className="mt-2">
                Администратор-основатель
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
