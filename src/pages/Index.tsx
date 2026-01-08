
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Hero />
      </div>
    );
  }
  
  // Для авторизованих користувачів показуємо основний інтерфейс
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden lg:block col-span-3 sticky top-20 h-fit" />
        <main className="col-span-12 lg:col-span-9">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Стрічка новин</h1>
          </div>
          <NewsFeed />
        </main>
      </div>
    </div>
  );
};

export default Index;
