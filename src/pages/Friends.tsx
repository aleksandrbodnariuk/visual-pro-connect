
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FriendsList } from "@/components/profile/FriendsList";
import { FriendRequestsList } from "@/components/profile/FriendRequestsList";

export default function Friends() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden lg:block col-span-3 sticky top-20 h-fit" />
        <main className="col-span-12 lg:col-span-9">
          <div className="max-w-4xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">Друзі</h1>
              <p className="text-muted-foreground">Знаходьте та спілкуйтеся з друзями</p>
            </div>
            
            <div className="space-y-6">
              <FriendRequestsList />
              <FriendsList />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
