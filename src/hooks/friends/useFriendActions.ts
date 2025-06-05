
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFriendActions() {
  const [isLoading, setIsLoading] = useState(false);

  const sendFriendRequest = async (receiverId: string, userName?: string) => {
    setIsLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      if (!currentUser || !currentUser.id) {
        console.error("No logged in user found");
        toast.error("Потрібно авторизуватися для відправки запиту");
        return false;
      }

      console.log("Sending friend request from", currentUser.id, "to", receiverId);

      // Перевіряємо чи не надсилали ми вже запит цьому користувачу
      const existingRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
      const existingRequest = existingRequests.find((req: any) => 
        req.sender_id === currentUser.id && req.receiver_id === receiverId ||
        req.sender_id === receiverId && req.receiver_id === currentUser.id
      );

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast.error("Запит на дружбу вже надіслано");
          return false;
        } else if (existingRequest.status === 'accepted') {
          toast.error("Ви вже друзі з цим користувачем");
          return false;
        }
      }

      // Створюємо новий запит
      const newRequest = {
        id: `req${crypto.randomUUID()}`,
        sender_id: currentUser.id,
        receiver_id: receiverId,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("Created friend request:", newRequest);

      // Спробуємо зберегти в Supabase
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .insert([newRequest]);
          
        if (error) {
          console.error("Error saving to Supabase:", error);
        } else {
          console.log("Friend request saved to Supabase successfully");
        }
      } catch (supabaseError) {
        console.warn("Supabase not available, using localStorage:", supabaseError);
      }

      // Зберігаємо в localStorage
      const updatedRequests = [...existingRequests, newRequest];
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
      
      // Створюємо повідомлення для отримувача
      const notificationMessage = {
        id: `notif${crypto.randomUUID()}`,
        user_id: receiverId,
        message: `${currentUser.full_name || currentUser.firstName + ' ' + currentUser.lastName || 'Користувач'} хоче додати вас у друзі`,
        is_read: false,
        created_at: new Date().toISOString(),
        type: 'friend_request',
        sender_id: currentUser.id
      };

      // Зберігаємо повідомлення
      const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      const updatedNotifications = [...existingNotifications, notificationMessage];
      localStorage.setItem('notifications', JSON.stringify(updatedNotifications));

      console.log("Friend request sent successfully");
      toast.success(`Запит на дружбу надіслано користувачу ${userName || 'користувачу'}`);
      
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error("Помилка при надсиланні запиту на дружбу");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    setIsLoading(true);
    try {
      console.log("Accepting friend request:", requestId);
      
      // Оновлюємо статус запиту в localStorage
      const existingRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
      const updatedRequests = existingRequests.map((req: any) => 
        req.id === requestId ? { ...req, status: 'accepted', updated_at: new Date().toISOString() } : req
      );
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));

      // Спробуємо оновити в Supabase
      try {
        const { error } = await supabase
          .from('friend_requests')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', requestId);
          
        if (error) {
          console.error("Error updating in Supabase:", error);
        } else {
          console.log("Friend request updated in Supabase successfully");
        }
      } catch (supabaseError) {
        console.warn("Supabase not available, using localStorage:", supabaseError);
      }

      toast.success("Запит на дружбу прийнято");
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error("Помилка при прийнятті запиту");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    setIsLoading(true);
    try {
      console.log("Rejecting friend request:", requestId);
      
      // Оновлюємо статус запиту в localStorage
      const existingRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
      const updatedRequests = existingRequests.map((req: any) => 
        req.id === requestId ? { ...req, status: 'rejected', updated_at: new Date().toISOString() } : req
      );
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));

      // Спробуємо оновити в Supabase
      try {
        const { error } = await supabase
          .from('friend_requests')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', requestId);
          
        if (error) {
          console.error("Error updating in Supabase:", error);
        } else {
          console.log("Friend request updated in Supabase successfully");
        }
      } catch (supabaseError) {
        console.warn("Supabase not available, using localStorage:", supabaseError);
      }

      toast.success("Запит на дружбу відхилено");
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error("Помилка при відхиленні запиту");
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
      console.log("Removing friend:", friendId);
      
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      // Видаляємо з друзів у localStorage
      const existingFriends = JSON.parse(localStorage.getItem('friends') || '[]');
      const updatedFriends = existingFriends.filter((friend: any) => friend.id !== friendId);
      localStorage.setItem('friends', JSON.stringify(updatedFriends));

      // Видаляємо запит на дружбу
      const existingRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
      const updatedRequests = existingRequests.filter((req: any) => 
        !((req.sender_id === currentUser.id && req.receiver_id === friendId) ||
          (req.sender_id === friendId && req.receiver_id === currentUser.id))
      );
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));

      toast.success("Друга видалено");
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error("Помилка при видаленні друга");
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
