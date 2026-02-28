
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
    <div className="min-h-screen bg-background pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
      <Navbar />
      
      <div className="container grid grid-cols-1 md:grid-cols-12 gap-0 px-2 sm:px-3 md:px-4 py-4 md:py-6">
        {/* Left Sidebar */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3">
          <div className="sticky top-14 sm:top-16 3xl:top-20 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] 3xl:h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain scrollbar-hide">
            <Sidebar />
          </div>
        </div>
        
        {/* Основний контент */}
        <main className="col-span-1 md:col-span-8 lg:col-span-6">
          <NewsFeed />
        </main>

        {/* Right Sidebar */}
        {appUser?.id && (
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-14 sm:top-16 3xl:top-20 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] 3xl:h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain scrollbar-hide">
              <RightSidebar userId={appUser.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
