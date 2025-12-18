
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFriendActions() {
  const [isLoading, setIsLoading] = useState(false);

  const sendFriendRequest = async (receiverId: string, userName?: string) => {
    setIsLoading(true);
    console.log("🚀 sendFriendRequest started", { receiverId, userName });
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("❌ Auth error:", authError);
        toast.error("Помилка авторизації");
        return false;
      }
      
      if (!user) {
        console.error("❌ No logged in user found");
        toast.error("Потрібно авторизуватися для відправки запиту");
        return false;
      }

      console.log("📤 User authenticated:", { userId: user.id, receiverId });

      // Не можна надсилати запит самому собі
      if (user.id === receiverId) {
        console.warn("⚠️ User tried to add themselves");
        toast.error("Не можна додати себе в друзі");
        return false;
      }

      // Перевіряємо чи не надсилали ми вже запит цьому користувачу
      // Використовуємо простіший запит з фільтрацією в JS
      console.log("🔍 Checking for existing requests...");
      const { data: allMyRequests, error: checkError } = await supabase
        .from('friend_requests')
        .select('*');

      console.log("🔍 All requests result:", { data: allMyRequests, error: checkError });

      if (checkError) {
        console.error("❌ Error checking existing requests:", checkError);
        toast.error(`Помилка перевірки: ${checkError.message}`);
        return false;
      }

      // Фільтруємо запити в JavaScript для точності
      const relevantRequests = allMyRequests?.filter(req => 
        (req.sender_id === user.id && req.receiver_id === receiverId) ||
        (req.sender_id === receiverId && req.receiver_id === user.id)
      ) || [];

      console.log("🔍 Relevant requests found:", relevantRequests);

      if (relevantRequests.length > 0) {
        const existingRequest = relevantRequests[0];
        console.log("⚠️ Existing request found:", existingRequest);
        if (existingRequest.status === 'pending') {
          toast.error("Запит на дружбу вже надіслано");
          return false;
        } else if (existingRequest.status === 'accepted') {
          toast.error("Ви вже друзі з цим користувачем");
          return false;
        }
      }

      // Створюємо новий запит
      console.log("➕ Inserting new friend request...");
      const insertPayload = {
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending'
      };
      console.log("➕ Insert payload:", insertPayload);

      const { data, error } = await supabase
        .from('friend_requests')
        .insert(insertPayload)
        .select()
        .single();
          
      if (error) {
        console.error("❌ Error inserting friend request:", error);
        console.error("❌ Error details:", { code: error.code, message: error.message, details: error.details, hint: error.hint });
        toast.error(`Помилка: ${error.message}`);
        return false;
      }

      console.log("✅ Friend request saved successfully:", data);

      // Отримуємо інформацію про користувача для повідомлення
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Створюємо повідомлення для отримувача
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: receiverId,
          message: `${userData?.full_name || 'Користувач'} хоче додати вас у друзі`,
          is_read: false
        }]);
          
      if (notifError) {
        console.error("⚠️ Error saving notification:", notifError);
      } else {
        console.log("✅ Notification created");
      }

      toast.success(`Запит на дружбу відправлено${userName ? ` користувачу ${userName}` : ''}`);
      return true;
    } catch (error: any) {
      console.error("❌ Unexpected error in sendFriendRequest:", error);
      toast.error(error?.message || "Помилка відправки запиту на дружбу");
      return false;
    } finally {
      setIsLoading(false);
      console.log("🏁 sendFriendRequest finished");
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Потрібно авторизуватися");
        return false;
      }

      console.log("Accepting friend request:", requestId);

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (error) {
        console.error("Error accepting friend request:", error);
        throw error;
      }

      console.log("Friend request accepted successfully");
      toast.success("Запит прийнято! Ви тепер друзі");
      return true;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Помилка прийняття запиту");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Потрібно авторизуватися");
        return false;
      }

      console.log("Rejecting friend request:", requestId);

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (error) {
        console.error("Error rejecting friend request:", error);
        throw error;
      }

      console.log("Friend request rejected successfully");
      toast.success("Запит відхилено");
      return true;
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Помилка відхилення запиту");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      return await acceptFriendRequest(requestId);
    } else {
      return await rejectFriendRequest(requestId);
    }
  };

  const removeFriend = async (friendId: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Потрібно авторизуватися");
        return false;
      }

      console.log("Removing friend:", friendId);

      // Видаляємо запит на дружбу
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .eq('status', 'accepted');

      if (error) {
        console.error("Error removing friend:", error);
        throw error;
      }

      console.log("Friend removed successfully");
      toast.success("Друга видалено");
      return true;
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Помилка видалення друга");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    respondToFriendRequest,
    removeFriend,
    isLoading
  };
}
