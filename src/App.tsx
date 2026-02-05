
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useDataSync } from "./hooks/useDataSync";
import { FaviconUpdater } from "./components/layout/FaviconUpdater";
import { MobileNavigation } from "./components/layout/MobileNavigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Connect from "./pages/Connect";
import Notifications from "./pages/Notifications";
import Friends from "./pages/Friends";
import Admin from "./pages/Admin";
import StockMarket from "./pages/StockMarket";
import Post from "./pages/Post";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  // Синхронізуємо дані з Supabase при завантаженні додатку
  useDataSync();
  
  return (
    <BrowserRouter>
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
        <Route path="/post/:postId" element={<Post />} />
        <Route path="/category/:categoryId" element={<Search />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <MobileNavigation />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <FaviconUpdater />
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
