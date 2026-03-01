
import { NewsFeed } from "@/components/feed/NewsFeed";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const { isAuthenticated, loading, appUser } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted/30 pt-14 sm:pt-16 3xl:pt-20">
        <Navbar />
        <Hero />
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-background overflow-hidden pt-14 sm:pt-16 3xl:pt-20">
      <Navbar />

      <div className="container grid grid-cols-1 md:grid-cols-12 items-start gap-0 px-2 sm:px-3 md:px-4 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] 3xl:h-[calc(100vh-5rem)]">
        {/* Left Sidebar */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3 h-full overflow-y-auto overscroll-contain scrollbar-hide py-4 md:py-6">
          <Sidebar />
        </aside>

        {/* Основний контент */}
        <main className="col-span-1 md:col-span-8 lg:col-span-6 h-full overflow-y-auto overscroll-contain scrollbar-hide py-4 md:py-6">
          <NewsFeed />
        </main>

        {/* Right Sidebar */}
        {appUser?.id && (
          <aside className="hidden lg:block lg:col-span-3 h-full overflow-y-auto overscroll-contain scrollbar-hide py-4 md:py-6">
            <RightSidebar userId={appUser.id} />
          </aside>
        )}
      </div>
    </div>
  );
};

export default Index;
