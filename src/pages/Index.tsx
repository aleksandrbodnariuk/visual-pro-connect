
import { Hero } from "@/components/home/Hero";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 ml-64">
          <div className="container mx-auto px-4 py-8">
            <NewsFeed />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
