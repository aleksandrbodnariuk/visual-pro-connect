
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <div className="w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 ml-64">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Стрічка новин</h1>
            </div>
            <NewsFeed />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
