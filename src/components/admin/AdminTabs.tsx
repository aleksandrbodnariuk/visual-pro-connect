
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTab } from "./tabs/UsersTab";
import { ShareholdersTab } from "./tabs/ShareholdersTab";
import { AdminOrdersTab } from "./tabs/AdminOrdersTab";
import { StockExchangeTab } from "./tabs/StockExchangeTab";
import { PostsTab } from "./tabs/PostsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { CategoriesTab } from "./tabs/CategoriesTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function AdminTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("users");
  
  useEffect(() => {
    const tabFromUrl = location.pathname.split('/').pop();
    if (tabFromUrl && tabFromUrl !== "admin") {
      setActiveTab(tabFromUrl);
    }
  }, [location]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/admin/${value}`, { replace: true });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4 flex overflow-x-auto gap-1 w-full justify-start pb-2">
        <TabsTrigger value="users">Користувачі</TabsTrigger>
        <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
        <TabsTrigger value="orders">Замовлення</TabsTrigger>
        <TabsTrigger value="stock-exchange">Ринок акцій</TabsTrigger>
        <TabsTrigger value="posts">Публікації</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
        <TabsTrigger value="settings">Налаштування</TabsTrigger>
        <TabsTrigger value="analytics">Аналітика</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <UsersTab />
      </TabsContent>
      
      <TabsContent value="shareholders">
        <ShareholdersTab />
      </TabsContent>
      
      <TabsContent value="orders">
        <AdminOrdersTab />
      </TabsContent>
      
      <TabsContent value="stock-exchange">
        <StockExchangeTab />
      </TabsContent>
      
      <TabsContent value="categories">
        <CategoriesTab />
      </TabsContent>
      
      <TabsContent value="posts">
        <PostsTab />
      </TabsContent>
      
      <TabsContent value="settings">
        <SettingsTab />
      </TabsContent>

      <TabsContent value="analytics">
        <AnalyticsTab />
      </TabsContent>
    </Tabs>
  );
}
