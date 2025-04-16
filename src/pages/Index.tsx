
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Hero } from "@/components/home/Hero";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { SearchCategories } from "@/components/search/SearchCategories";

export default function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <div className="container my-10 flex gap-6">
        <main className="flex-1">
          <SearchCategories />
          <NewsFeed />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
