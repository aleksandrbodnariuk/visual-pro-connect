
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [stockPrice, setStockPrice] = useState("1000");
  
  const navigate = useNavigate();
  const { tabName } = useParams<{ tabName: string }>();
  const { appUser: currentUser, isAuthenticated, loading } = useAuth();
  
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

  // Redirect to default tab
  useEffect(() => {
    if (!tabName) {
      navigate("/admin/users", { replace: true });
    }
  }, [tabName, navigate]);

  // Load data when user is confirmed admin
  useEffect(() => {
    if (loading) return;
    if (!currentUser) return; // still loading appUser
    if (!currentUser.isAdmin && !currentUser.founder_admin) return;
    
    loadUsersData();
    
    const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    setOrders(storedOrders);
    
    const storedStockPrice = localStorage.getItem("stockPrice");
    if (storedStockPrice) {
      setStockPrice(storedStockPrice);
    } else {
      localStorage.setItem("stockPrice", stockPrice);
    }

    const handleShareholderUpdate = () => loadUsersData();
    const handleStockPriceUpdate = (event: CustomEvent) => setStockPrice(event.detail.price);

    window.addEventListener('shareholder-status-updated', handleShareholderUpdate);
    window.addEventListener('stock-price-updated', handleStockPriceUpdate as EventListener);
    window.addEventListener('storage', loadUsersData);

    return () => {
      window.removeEventListener('shareholder-status-updated', handleShareholderUpdate);
      window.removeEventListener('stock-price-updated', handleStockPriceUpdate as EventListener);
      window.removeEventListener('storage', loadUsersData);
    };
  }, [loading, currentUser?.id, stockPrice]);

  if (loading || (isAuthenticated && !currentUser)) {
    return <div className="container py-16 text-center">Завантаження...</div>;
  }

  if (!isAuthenticated || !currentUser) {
    navigate("/auth");
    return null;
  }

  if (!currentUser.isAdmin && !currentUser.founder_admin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen pt-14 sm:pt-16 3xl:pt-20 pb-safe-nav">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Панель адміністратора</h1>
            <p className="text-muted-foreground">Управління сайтом Спільнота B&C</p>
            
            {currentUser.founder_admin && (
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
