
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { toast } from "sonner";

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
    if (!currentUser || !(currentUser.isAdmin || currentUser.role === "admin" || currentUser.role === "admin-founder")) {
      toast.error("Доступ заборонено: Необхідні права адміністратора");
      navigate("/auth");
      return;
    }
    
    setIsAdmin(true);
    setIsFounder(currentUser.role === "admin-founder");
    
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    setUsers(storedUsers);
    
    const shareholdersData = storedUsers.filter((user: any) => 
      user.status === "Акціонер" || user.role === "shareholder"
    );
    setShareholders(shareholdersData);
    
    const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    setOrders(storedOrders);
    
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
