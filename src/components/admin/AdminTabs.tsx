
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UsersTab = lazy(() => import("./tabs/UsersTab").then(m => ({ default: m.UsersTab })));
const ShareholdersTab = lazy(() => import("./tabs/ShareholdersTab").then(m => ({ default: m.ShareholdersTab })));
const SpecialistsTab = lazy(() => import("./tabs/SpecialistsTab").then(m => ({ default: m.SpecialistsTab })));
const RepresentativesTab = lazy(() => import("./tabs/RepresentativesTab").then(m => ({ default: m.RepresentativesTab })));
const AdminOrdersTab = lazy(() => import("./tabs/AdminOrdersTab").then(m => ({ default: m.AdminOrdersTab })));
const AdOrdersTab = lazy(() => import("./tabs/AdOrdersTab").then(m => ({ default: m.AdOrdersTab })));
const FeedAdsTab = lazy(() => import("./tabs/FeedAdsTab").then(m => ({ default: m.FeedAdsTab })));
const StockExchangeTab = lazy(() => import("./tabs/StockExchangeTab").then(m => ({ default: m.StockExchangeTab })));
const PostsTab = lazy(() => import("./tabs/PostsTab").then(m => ({ default: m.PostsTab })));
const SettingsTab = lazy(() => import("./tabs/SettingsTab").then(m => ({ default: m.SettingsTab })));
const CategoriesTab = lazy(() => import("./tabs/CategoriesTab").then(m => ({ default: m.CategoriesTab })));
const PortfolioCategoriesTab = lazy(() => import("./tabs/PortfolioCategoriesTab").then(m => ({ default: m.PortfolioCategoriesTab })));
const AnalyticsTab = lazy(() => import("./tabs/AnalyticsTab").then(m => ({ default: m.AnalyticsTab })));
const FinancialStatsTab = lazy(() => import("./tabs/FinancialStatsTab").then(m => ({ default: m.FinancialStatsTab })));
const CalculationHistoryTab = lazy(() => import("./tabs/CalculationHistoryTab").then(m => ({ default: m.CalculationHistoryTab })));
const AssetValuationTab = lazy(() => import("./tabs/AssetValuationTab").then(m => ({ default: m.AssetValuationTab })));
const PayoutsTab = lazy(() => import("./tabs/PayoutsTab").then(m => ({ default: m.PayoutsTab })));
const NotificationsTab = lazy(() => import("./tabs/NotificationsTab").then(m => ({ default: m.NotificationsTab })));
const SupportTab = lazy(() => import("./tabs/SupportTab").then(m => ({ default: m.SupportTab })));
const CertificatesTab = lazy(() => import("./tabs/CertificatesTab").then(m => ({ default: m.CertificatesTab })));
const VipTab = lazy(() => import("./tabs/VipTab").then(m => ({ default: m.VipTab })));
const MarketplaceTab = lazy(() => import("./tabs/MarketplaceTab").then(m => ({ default: m.MarketplaceTab })));
const StorageTab = lazy(() => import("./tabs/StorageTab").then(m => ({ default: m.StorageTab })));
const ClientsTab = lazy(() => import("./tabs/ClientsTab").then(m => ({ default: m.ClientsTab })));

const ADMIN_SECTIONS = [
  ["users", "Користувачі"], ["specialists", "Фахівці"], ["shareholders", "Акціонери"],
  ["representatives", "Представники"], ["clients", "Клієнти"], ["posts", "Публікації"],
  ["categories", "Категорії"], ["portfolio-categories", "Категорії портфоліо"], ["analytics", "Аналітика"],
  ["notifications-admin", "Сповіщення"], ["settings", "Налаштування"], ["orders", "Замовлення"],
  ["ad-orders", "Реклама"], ["feed-ads", "Реклама в стрічці"], ["finances", "Фінанси"], ["payouts", "Виплати"],
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
        <TabsTrigger value="feed-ads">Реклама в стрічці</TabsTrigger>
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
      <Suspense fallback={<p className="py-8 text-center text-sm text-muted-foreground">Завантаження розділу…</p>}>
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

      <TabsContent value="feed-ads">
        <FeedAdsTab />
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
      </Suspense>
      </div>
    </Tabs>
  );
}
