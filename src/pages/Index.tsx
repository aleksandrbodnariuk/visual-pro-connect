
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewsFeed } from "@/components/feed/NewsFeed";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="container py-6">
            <NewsFeed />
          </div>
        </main>
      </div>
    </div>
  );
}
