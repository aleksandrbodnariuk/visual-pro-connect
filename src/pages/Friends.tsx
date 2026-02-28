
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FriendsList } from "@/components/profile/FriendsList";
import { FriendRequestsList } from "@/components/profile/FriendRequestsList";
import { BlockedUsersList } from "@/components/profile/BlockedUsersList";

export default function Friends() {
  return (
    <div className="min-h-screen bg-background pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
      <Navbar />
      <div className="container grid grid-cols-12 items-start gap-0 px-2 sm:px-3 md:px-4 py-6">
        <div className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-14 sm:top-16 3xl:top-20 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] 3xl:h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain scrollbar-hide">
          <Sidebar />
        </div>
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <div className="max-w-4xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">Друзі</h1>
              <p className="text-muted-foreground">Знаходьте та спілкуйтеся з друзями</p>
            </div>
            
            <div className="space-y-6">
              <FriendRequestsList />
              <FriendsList />
              <BlockedUsersList />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
