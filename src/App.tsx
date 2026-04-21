// v2 cache bust
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import { useDataSync } from "./hooks/useDataSync";
import { usePushAutoSubscribe } from "./hooks/usePushSubscription";
import { useBadgeClear } from "./hooks/useBadgeClear";
import { useAnalyticsTracker } from "./hooks/useAnalyticsTracker";
import { FaviconUpdater } from "./components/layout/FaviconUpdater";
import { MobileNavigation } from "./components/layout/MobileNavigation";
import { InstallPrompt } from "./components/pwa/InstallPrompt";
import { PushOnboarding } from "./components/pwa/PushOnboarding";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { SupportButton } from "./components/support/SupportButton";
import Index from "./pages/Index";

// Lazy-loaded pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Messages = lazy(() => import("./pages/Messages"));
const Search = lazy(() => import("./pages/Search"));
const Settings = lazy(() => import("./pages/Settings"));
const Connect = lazy(() => import("./pages/Connect"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Friends = lazy(() => import("./pages/Friends"));
const Admin = lazy(() => import("./pages/Admin"));
const StockMarket = lazy(() => import("./pages/StockMarket"));
const ShareholderPanel = lazy(() => import("./pages/ShareholderPanel"));
const Post = lazy(() => import("./pages/Post"));
const MyFiles = lazy(() => import("./pages/MyFiles"));
const SpecialistPanel = lazy(() => import("./pages/SpecialistPanel"));
const RepresentativePanel = lazy(() => import("./pages/RepresentativePanel"));
const ModeratorPanel = lazy(() => import("./pages/ModeratorPanel"));
const ServiceCatalog = lazy(() => import("./pages/ServiceCatalog"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Sertyfikaty = lazy(() => import("./pages/Sertyfikaty"));
const MoiSertyfikaty = lazy(() => import("./pages/MoiSertyfikaty"));
const Vip = lazy(() => import("./pages/Vip"));
const MoyVip = lazy(() => import("./pages/MoyVip"));
const VipTools = lazy(() => import("./pages/vip/Tools"));
const VipNotebook = lazy(() => import("./pages/vip/Notebook"));
const VipCalculator = lazy(() => import("./pages/vip/Calculator"));
const VipReminders = lazy(() => import("./pages/vip/Reminders"));
const VipPlanner = lazy(() => import("./pages/vip/Planner"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceListing = lazy(() => import("./pages/MarketplaceListing"));
const MarketplaceNew = lazy(() => import("./pages/MarketplaceNew"));
const MarketplaceMine = lazy(() => import("./pages/MarketplaceMine"));
const MarketplaceFavorites = lazy(() => import("./pages/MarketplaceFavorites"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Must be rendered inside BrowserRouter
const AnalyticsTrackerInner = () => { useAnalyticsTracker(); return null; };

const AppContent = () => {
  // Синхронізуємо дані з Supabase при завантаженні додатку
  useDataSync();
  // Auto-subscribe to push notifications if permission was previously granted
  usePushAutoSubscribe();
  // Clear app badge when user opens/focuses the app
  useBadgeClear();
  
  return (
    <BrowserRouter>
      <AnalyticsTrackerInner />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/:tabName" element={<Admin />} />
            <Route path="/stock-market" element={<StockMarket />} />
            <Route path="/shareholder-panel" element={<ShareholderPanel />} />
            <Route path="/post/:postId" element={<Post />} />
            <Route path="/my-files" element={<MyFiles />} />
            <Route path="/my-files/:type" element={<MyFiles />} />
            <Route path="/files/:userId" element={<MyFiles />} />
            <Route path="/files/:userId/:type" element={<MyFiles />} />
            <Route path="/category/:categoryId" element={<Search />} />
            <Route path="/panel-fahivtsya" element={<SpecialistPanel />} />
            <Route path="/representative-panel" element={<RepresentativePanel />} />
            <Route path="/moderator-panel" element={<ModeratorPanel />} />
            <Route path="/services" element={<ServiceCatalog />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/sertyfikaty" element={<Sertyfikaty />} />
            <Route path="/sertyfikaty/moi" element={<MoiSertyfikaty />} />
            <Route path="/vip" element={<Vip />} />
            <Route path="/vip/moi" element={<MoyVip />} />
            <Route path="/vip/tools" element={<VipTools />} />
            <Route path="/vip/notebook" element={<VipNotebook />} />
            <Route path="/vip/calculator" element={<VipCalculator />} />
            <Route path="/vip/reminders" element={<VipReminders />} />
            <Route path="/vip/planner" element={<VipPlanner />} />
            <Route path="/market" element={<Marketplace />} />
            <Route path="/market/new" element={<MarketplaceNew />} />
            <Route path="/market/moi" element={<MarketplaceMine />} />
            <Route path="/market/favorites" element={<MarketplaceFavorites />} />
            <Route path="/market/:id" element={<MarketplaceListing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <MobileNavigation />
      <SupportButton />
      <InstallPrompt />
      <PushOnboarding />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <SiteSettingsProvider>
            <TooltipProvider>
              <FaviconUpdater />
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </SiteSettingsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
