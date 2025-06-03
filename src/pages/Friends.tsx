
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FriendsList } from "@/components/profile/FriendsList";

export default function Friends() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <div className="w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 ml-64">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Друзі</h1>
                <p className="text-gray-600">Знаходьте та спілкуйтеся з друзями</p>
              </div>
              
              <FriendsList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
