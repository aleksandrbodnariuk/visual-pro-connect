
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTab } from "./tabs/UsersTab";
import { ShareholdersTab } from "./tabs/ShareholdersTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { ArchivedOrdersTab } from "./tabs/ArchivedOrdersTab";
import { StockExchangeTab } from "./tabs/StockExchangeTab";
import { PostsTab } from "./tabs/PostsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { PortfolioManagementTab } from "./tabs/PortfolioManagementTab";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function AdminTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("users");
  
  // Витягуємо активну вкладку з URL якщо вона є
  useEffect(() => {
    const tabFromUrl = location.pathname.split('/').pop();
    if (tabFromUrl && tabFromUrl !== "admin") {
      setActiveTab(tabFromUrl);
    }
  }, [location]);
  
  // Обробник зміни вкладки
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Оновлюємо URL для збереження стану між перезавантаженнями
    navigate(`/admin/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4 flex flex-wrap gap-1">
        <TabsTrigger value="users">Користувачі</TabsTrigger>
        <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
        <TabsTrigger value="portfolio">Портфоліо</TabsTrigger>
        <TabsTrigger value="orders">Замовлення</TabsTrigger>
        <TabsTrigger value="archived-orders">Архів замовлень</TabsTrigger>
        <TabsTrigger value="stock-exchange">Ринок акцій</TabsTrigger>
        <TabsTrigger value="posts">Публікації</TabsTrigger>
        <TabsTrigger value="settings">Налаштування</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <UsersTab />
      </TabsContent>
      
      <TabsContent value="shareholders">
        <ShareholdersTab />
      </TabsContent>
      
      <TabsContent value="portfolio">
        <PortfolioManagementTab />
      </TabsContent>
      
      <TabsContent value="orders">
        <OrdersTab />
      </TabsContent>
      
      <TabsContent value="archived-orders">
        <ArchivedOrdersTab />
      </TabsContent>
      
      <TabsContent value="stock-exchange">
        <StockExchangeTab />
      </TabsContent>
      
      <TabsContent value="posts">
        <PostsTab />
      </TabsContent>
      
      <TabsContent value="settings">
        <SettingsTab />
      </TabsContent>
    </Tabs>
  );
}
