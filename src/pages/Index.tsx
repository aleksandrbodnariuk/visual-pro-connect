
import { NewsFeed } from "@/components/feed/NewsFeed";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { useAuth } from "@/context/AuthContext";
import { CreatePublicationButton } from "@/components/publications/CreatePublicationButton";

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  
  // Показуємо loader поки визначається стан
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Якщо користувач не авторизований, показуємо Hero секцію
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted/30 pt-14 sm:pt-16 3xl:pt-20">
        <Navbar />
        <Hero />
      </div>
    );
  }
  
  // Для авторизованих користувачів показуємо основний інтерфейс
  return (
    <div className="min-h-screen bg-background pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
      <Navbar />
      {/* Fixed Sidebar - рендериться окремо від grid */}
      <Sidebar />
      
      <div className="container grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 3xl:gap-8 px-3 sm:px-4 md:px-6 py-4 md:py-6">
        {/* Spacer для fixed sidebar */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
        
        {/* Основний контент */}
        <main className="col-span-1 md:col-span-8 lg:col-span-9">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl sm:text-2xl 3xl:text-3xl font-bold">Стрічка новин</h1>
          </div>
          <NewsFeed />
        </main>
      </div>
    </div>
  );
};

export default Index;
