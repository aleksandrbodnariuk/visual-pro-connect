
import React from 'react'; // Add this import to fix TS2686
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { LanguageProvider } from "./context/LanguageContext";

// Завантаження сторінок через lazy для оптимізації
const Index = lazy(() => import("./pages/Index"));
const Profile = lazy(() => import("./pages/Profile"));
const Messages = lazy(() => import("./pages/Messages"));
const Search = lazy(() => import("./pages/Search"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Connect = lazy(() => import("./pages/Connect"));
const StockMarket = lazy(() => import("./pages/StockMarket"));

// Компонент завантаження
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    <span className="ml-3">Завантаження...</span>
  </div>
);

// ErrorBoundary компонент для відловлювання помилок
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Відловлена помилка:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-4">Щось пішло не так</h1>
          <p className="mb-6 text-center">
            Виникла помилка при завантаженні сторінки. Спробуйте оновити сторінку або повернутися на головну.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              Оновити сторінку
            </button>
            <button 
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }} 
              className="px-4 py-2 bg-secondary text-white rounded-md"
            >
              На головну
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    // Глобальний обробник помилок
    const handleError = (event: ErrorEvent) => {
      console.error("Глобальна помилка:", event.error);
      // Можна додати логіку для відправки помилок на сервер
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/profile" element={<Navigate to={`/profile/${JSON.parse(localStorage.getItem("currentUser") || "{}")?.id || ""}`} />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/:tabName" element={<Admin />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/connect" element={<Connect />} />
                  <Route path="/stock-market" element={<StockMarket />} />
                  <Route path="/category/:categoryType" element={<Search />} />
                  {/* Універсальний маршрут для перехоплення всіх інших URL */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
          <Sonner />
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;

