
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFriendActions() {
  const [isLoading, setIsLoading] = useState(false);

  const sendFriendRequest = async (receiverId: string, userName?: string) => {
    setIsLoading(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        if (import.meta.env.DEV) console.error("Auth error:", authError);
        toast.error("Помилка авторизації");
        return false;
      }
      
      if (!user) {
        toast.error("Потрібно авторизуватися для відправки запиту");
        return false;
      }

      // Не можна надсилати запит самому собі
      if (user.id === receiverId) {
        toast.error("Не можна додати себе в друзі");
        return false;
      }

      // Перевіряємо чи не надсилали ми вже запит цьому користувачу
      const { data: allMyRequests, error: checkError } = await supabase
        .from('friend_requests')
        .select('*');

      if (checkError) {
        if (import.meta.env.DEV) console.error("Error checking existing requests:", checkError);
        toast.error("Помилка перевірки запитів");
        return false;
      }

      // Фільтруємо запити в JavaScript для точності
      const relevantRequests = allMyRequests?.filter(req => 
        (req.sender_id === user.id && req.receiver_id === receiverId) ||
        (req.sender_id === receiverId && req.receiver_id === user.id)
      ) || [];

      if (relevantRequests.length > 0) {
        const existingRequest = relevantRequests[0];
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
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select()
        .single();
          
      if (error) {
        if (import.meta.env.DEV) console.error("Error inserting friend request:", error);
        toast.error("Не вдалося надіслати запит. Спробуйте ще раз.");
        return false;
      }

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
          
      if (import.meta.env.DEV && notifError) {
        console.error("Error saving notification:", notifError);
      }

      toast.success(`Запит на дружбу відправлено${userName ? ` користувачу ${userName}` : ''}`);
      return true;
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Unexpected error in sendFriendRequest:", error);
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

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (error) {
        if (import.meta.env.DEV) console.error("Error accepting friend request:", error);
        throw error;
      }

      toast.success("Запит прийнято! Ви тепер друзі");
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error accepting friend request:", error);
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

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('receiver_id', user.id);

      if (error) {
        if (import.meta.env.DEV) console.error("Error rejecting friend request:", error);
        throw error;
      }
      toast.success("Запит відхилено");
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error rejecting friend request:", error);
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

      // Видаляємо запит на дружбу
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .eq('status', 'accepted');

      if (error) {
        if (import.meta.env.DEV) console.error("Error removing friend:", error);
        throw error;
      }

      toast.success("Друга видалено");
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error removing friend:", error);
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
