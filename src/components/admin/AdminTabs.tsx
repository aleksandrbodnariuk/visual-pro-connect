
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTab } from "./tabs/UsersTab";
import { ShareholdersTab } from "./tabs/ShareholdersTab";
import { SpecialistsTab } from "./tabs/SpecialistsTab";
import { RepresentativesTab } from "./tabs/RepresentativesTab";
import { AdminOrdersTab } from "./tabs/AdminOrdersTab";
import { AdOrdersTab } from "./tabs/AdOrdersTab";
import { StockExchangeTab } from "./tabs/StockExchangeTab";
import { PostsTab } from "./tabs/PostsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { CategoriesTab } from "./tabs/CategoriesTab";
import { PortfolioCategoriesTab } from "./tabs/PortfolioCategoriesTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { FinancialStatsTab } from "./tabs/FinancialStatsTab";
import { CalculationHistoryTab } from "./tabs/CalculationHistoryTab";
import { AssetValuationTab } from "./tabs/AssetValuationTab";
import { PayoutsTab } from "./tabs/PayoutsTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { SupportTab } from "./tabs/SupportTab";
import { CertificatesTab } from "./tabs/CertificatesTab";
import { VipTab } from "./tabs/VipTab";
import { MarketplaceTab } from "./tabs/MarketplaceTab";
import { StorageTab } from "./tabs/StorageTab";
import { ClientsTab } from "./tabs/ClientsTab";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ADMIN_SECTIONS = [
  ["users", "Користувачі"], ["specialists", "Фахівці"], ["shareholders", "Акціонери"],
  ["representatives", "Представники"], ["clients", "Клієнти"], ["posts", "Публікації"],
  ["categories", "Категорії"], ["portfolio-categories", "Категорії портфоліо"], ["analytics", "Аналітика"],
  ["notifications-admin", "Сповіщення"], ["settings", "Налаштування"], ["orders", "Замовлення"],
  ["ad-orders", "Реклама"], ["finances", "Фінанси"], ["payouts", "Виплати"],
  ["history", "Історія розрахунків"], ["stock-exchange", "Облік акцій"], ["assets", "Облік майна"],
  ["support", "Підтримка"], ["certificates", "Сертифікати"], ["vip", "VIP"],
  ["marketplace", "Маркетплейс"], ["storage", "Сховище"]
] as const;

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
    <Tabs value={activeTab} onValueChange={handleTabChange} className="min-w-0 w-full">
      <div className="mb-4 md:hidden">
        <label className="mb-2 block text-sm font-medium" htmlFor="admin-section">Розділ адміністратора</label>
        <Select value={activeTab} onValueChange={handleTabChange}>
          <SelectTrigger id="admin-section" className="min-h-11 w-full">
            <SelectValue placeholder="Оберіть розділ" />
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {ADMIN_SECTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TabsList className="mb-4 hidden w-full justify-start gap-1 overflow-x-auto pb-2 md:flex">
        <TabsTrigger value="users">Користувачі</TabsTrigger>
        <TabsTrigger value="specialists">Фахівці</TabsTrigger>
        <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
        <TabsTrigger value="representatives">Представники</TabsTrigger>
        <TabsTrigger value="clients">Клієнти</TabsTrigger>

        <div className="w-px self-stretch bg-border mx-1 shrink-0" />

        <TabsTrigger value="posts">Публікації</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
        <TabsTrigger value="portfolio-categories">Категорії портфоліо</TabsTrigger>
        <TabsTrigger value="analytics">Аналітика</TabsTrigger>
        <TabsTrigger value="notifications-admin">Сповіщення</TabsTrigger>
        <TabsTrigger value="settings">Налаштування</TabsTrigger>

        <div className="w-px self-stretch bg-border mx-1 shrink-0" />

        <TabsTrigger value="orders">Замовлення</TabsTrigger>
        <TabsTrigger value="ad-orders">Реклама</TabsTrigger>
        <TabsTrigger value="finances">Фінанси</TabsTrigger>
        <TabsTrigger value="payouts">Виплати</TabsTrigger>
        <TabsTrigger value="history">Історія розрахунків</TabsTrigger>

        <div className="w-px self-stretch bg-border mx-1 shrink-0" />

        <TabsTrigger value="stock-exchange">Облік часток</TabsTrigger>
        <TabsTrigger value="assets">Облік майна</TabsTrigger>

        <div className="w-px self-stretch bg-border mx-1 shrink-0" />

        <TabsTrigger value="support">Підтримка</TabsTrigger>
        <TabsTrigger value="certificates">Сертифікати</TabsTrigger>
        <TabsTrigger value="vip">VIP</TabsTrigger>
        <TabsTrigger value="marketplace">Маркетплейс</TabsTrigger>
        <TabsTrigger value="storage">Сховище</TabsTrigger>
      </TabsList>
      
      <div className="min-w-0 max-w-full overflow-x-hidden">
      <TabsContent value="users">
        <UsersTab />
      </TabsContent>
      
      <TabsContent value="shareholders">
        <ShareholdersTab />
      </TabsContent>
      
      <TabsContent value="specialists">
        <SpecialistsTab />
      </TabsContent>

      <TabsContent value="representatives">
        <RepresentativesTab />
      </TabsContent>

      <TabsContent value="clients">
        <ClientsTab />
      </TabsContent>
      
      <TabsContent value="orders">
        <AdminOrdersTab />
      </TabsContent>

      <TabsContent value="ad-orders">
        <AdOrdersTab />
      </TabsContent>
      
      <TabsContent value="stock-exchange">
        <StockExchangeTab />
      </TabsContent>
      
      <TabsContent value="categories">
        <CategoriesTab />
      </TabsContent>

      <TabsContent value="portfolio-categories">
        <PortfolioCategoriesTab />
      </TabsContent>
      
      <TabsContent value="posts">
        <PostsTab />
      </TabsContent>
      
      <TabsContent value="settings">
        <SettingsTab />
      </TabsContent>

      <TabsContent value="notifications-admin">
        <NotificationsTab />
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

      <TabsContent value="support">
        <SupportTab />
      </TabsContent>

      <TabsContent value="certificates">
        <CertificatesTab />
      </TabsContent>

      <TabsContent value="vip">
        <VipTab />
      </TabsContent>

      <TabsContent value="marketplace">
        <MarketplaceTab />
      </TabsContent>

      <TabsContent value="storage">
        <StorageTab />
      </TabsContent>
      </div>
    </Tabs>
  );
}
