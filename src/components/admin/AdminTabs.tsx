
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTab } from "./tabs/UsersTab";
import { ShareholdersTab } from "./tabs/ShareholdersTab";
import { SpecialistsTab } from "./tabs/SpecialistsTab";
import { AdminOrdersTab } from "./tabs/AdminOrdersTab";
import { StockExchangeTab } from "./tabs/StockExchangeTab";
import { PostsTab } from "./tabs/PostsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { CategoriesTab } from "./tabs/CategoriesTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { FinancialStatsTab } from "./tabs/FinancialStatsTab";
import { CalculationHistoryTab } from "./tabs/CalculationHistoryTab";
import { AssetValuationTab } from "./tabs/AssetValuationTab";
import { PayoutsTab } from "./tabs/PayoutsTab";
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
        <TabsTrigger value="specialists">Фахівці</TabsTrigger>
        <TabsTrigger value="orders">Замовлення</TabsTrigger>
        <TabsTrigger value="stock-exchange">Облік часток</TabsTrigger>
        <TabsTrigger value="posts">Публікації</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
        <TabsTrigger value="settings">Налаштування</TabsTrigger>
        <TabsTrigger value="analytics">Аналітика</TabsTrigger>
        <TabsTrigger value="finances">Фінанси</TabsTrigger>
        <TabsTrigger value="history">Історія розрахунків</TabsTrigger>
        <TabsTrigger value="assets">Облік майна</TabsTrigger>
        <TabsTrigger value="payouts">Виплати</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <UsersTab />
      </TabsContent>
      
      <TabsContent value="shareholders">
        <ShareholdersTab />
      </TabsContent>
      
      <TabsContent value="specialists">
        <SpecialistsTab />
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

      <TabsContent value="finances">
        <FinancialStatsTab />
      </TabsContent>

      <TabsContent value="history">
        <CalculationHistoryTab />
      </TabsContent>

      <TabsContent value="assets">
        <AssetValuationTab />
      </TabsContent>

      <TabsContent value="payouts">
        <PayoutsTab />
      </TabsContent>
    </Tabs>
  );
}
