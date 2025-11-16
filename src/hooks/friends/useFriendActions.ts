
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFriendActions() {
  const [isLoading, setIsLoading] = useState(false);

  const sendFriendRequest = async (receiverId: string, userName?: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No logged in user found");
        toast.error("Потрібно авторизуватися для відправки запиту");
        return false;
      }

      console.log("Sending friend request from", user.id, "to", receiverId);

      // Не можна надсилати запит самому собі
      if (user.id === receiverId) {
        toast.error("Не можна додати себе в друзі");
        return false;
      }

      // Перевіряємо чи не надсилали ми вже запит цьому користувачу
      const { data: existingRequests, error: checkError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);

      if (checkError) {
        console.error("Error checking existing requests:", checkError);
        throw checkError;
      }

      if (existingRequests && existingRequests.length > 0) {
        const existingRequest = existingRequests[0];
        if (existingRequest.status === 'pending') {
          toast.error("Запит на дружбу вже надіслано");
          return false;
        } else if (existingRequest.status === 'accepted') {
          toast.error("Ви вже друзі з цим користувачем");
          return false;
        }
      }

      // Створюємо новий запит
      const { data, error } = await supabase
        .from('friend_requests')
        .insert([{
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        }])
        .select()
        .single();
          
      if (error) {
        console.error("Error saving to Supabase:", error);
        throw error;
      }

      console.log("Friend request saved to Supabase successfully", data);

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
        console.error("Error saving notification to Supabase:", notifError);
      }

      toast.success(`Запит на дружбу відправлено${userName ? ` користувачу ${userName}` : ''}`);
      return true;
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Помилка відправки запиту на дружбу");
      return false;
    } finally {
      setIsLoading(false);
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
