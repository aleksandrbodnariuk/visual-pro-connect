
import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FriendsList } from "@/components/profile/FriendsList";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function FriendsPage() {
  const { friends, sendFriendRequest } = useFriendRequests();
  const [userIdToAdd, setUserIdToAdd] = useState("");

  // Простий пошук друга по id (можна розшити під реальну логіку пошуку)
  const handleAddFriend = () => {
    if (userIdToAdd.trim()) {
      sendFriendRequest(userIdToAdd.trim());
      setUserIdToAdd("");
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      <div className="container mt-8 grid grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3">
          <Sidebar className="sticky top-20" />
        </div>
        <main className="col-span-12 md:col-span-9">
          <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
            <Input
              type="text"
              placeholder="Введіть ID користувача для додавання в друзі"
              value={userIdToAdd}
              onChange={e => setUserIdToAdd(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <Button onClick={handleAddFriend} disabled={!userIdToAdd}>
              <UserPlus className="mr-2 h-4 w-4" />
              Додати в друзі
            </Button>
          </div>
          <FriendsList userId="" /> {/* тут userId неважливо, бо хук сам знає поточного користувача */}
        </main>
      </div>
    </div>
  );
}
