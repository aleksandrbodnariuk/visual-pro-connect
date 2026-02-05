
import { NewsFeed } from "@/components/feed/NewsFeed";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { CreatePublicationButton } from "@/components/publications/CreatePublicationButton";

const Index = () => {
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  
  // Якщо користувач не авторизований, показуємо Hero секцію
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <Hero />
      </div>
    );
  }
  
  // Для авторизованих користувачів показуємо основний інтерфейс
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 3xl:gap-8 px-3 sm:px-4 md:px-6 py-4 md:py-6">
        {/* Sidebar - прихований на мобільних, видимий на планшеті+ */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3 min-h-full">
          <Sidebar />
        </div>
        
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
