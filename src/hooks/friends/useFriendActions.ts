
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function useFriendActions() {
  const [isLoading, setIsLoading] = useState(false);
  const { user: authUser } = useAuth();

  const getUserId = (): string | null => authUser?.id || null;

  const sendFriendRequest = async (receiverId: string, userName?: string) => {
    setIsLoading(true);
    
    try {
      const userId = getUserId();
      if (!userId) {
        toast.error("Потрібно авторизуватися для відправки запиту");
        return false;
      }

      if (userId === receiverId) {
        toast.error("Не можна додати себе в друзі");
        return false;
      }

      const { data: allMyRequests, error: checkError } = await supabase
        .from('friend_requests')
        .select('*');

      if (checkError) {
        toast.error("Помилка перевірки запитів");
        return false;
      }

      const relevantRequests = allMyRequests?.filter(req => 
        (req.sender_id === userId && req.receiver_id === receiverId) ||
        (req.sender_id === receiverId && req.receiver_id === userId)
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

      const { error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: userId, receiver_id: receiverId, status: 'pending' })
        .select()
        .single();
          
      if (error) {
        toast.error("Не вдалося надіслати запит. Спробуйте ще раз.");
        return false;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      await supabase.rpc('send_friend_request_notification', {
        p_receiver_id: receiverId,
        p_sender_name: userData?.full_name || 'Користувач'
      });

      toast.success(`Запит на дружбу відправлено${userName ? ` користувачу ${userName}` : ''}`);
      return true;
    } catch (error: any) {
      toast.error("Помилка відправки запиту на дружбу");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    setIsLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { toast.error("Потрібно авторизуватися"); return false; }

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('receiver_id', userId);

      if (error) throw error;
      toast.success("Запит прийнято! Ви тепер друзі");
      return true;
    } catch (error) {
      toast.error("Помилка прийняття запиту");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    setIsLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { toast.error("Потрібно авторизуватися"); return false; }

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('receiver_id', userId);

      if (error) throw error;
      toast.success("Запит відхилено");
      return true;
    } catch (error) {
      toast.error("Помилка відхилення запиту");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (action === 'accept') return await acceptFriendRequest(requestId);
    else return await rejectFriendRequest(requestId);
  };

  const removeFriend = async (friendId: string) => {
    setIsLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { toast.error("Потрібно авторизуватися"); return false; }

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
        .eq('status', 'accepted');

      if (error) throw error;
      toast.success("Друга видалено");
      return true;
    } catch (error) {
      toast.error("Помилка видалення друга");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const blockUser = async (targetUserId: string) => {
    setIsLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { toast.error("Потрібно авторизуватися"); return false; }

      await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`);

      const { error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: userId, receiver_id: targetUserId, status: 'blocked' });

      if (error) {
        toast.error("Не вдалося заблокувати користувача");
        return false;
      }

      toast.success("Користувача заблоковано");
      return true;
    } catch (error) {
      toast.error("Помилка блокування користувача");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unblockUser = async (targetUserId: string) => {
    setIsLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { toast.error("Потрібно авторизуватися"); return false; }

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('sender_id', userId)
        .eq('receiver_id', targetUserId)
        .eq('status', 'blocked');

      if (error) {
        toast.error("Не вдалося розблокувати користувача");
        return false;
      }

      toast.success("Користувача розблоковано");
      return true;
    } catch (error) {
      toast.error("Помилка розблокування");
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
    blockUser,
    unblockUser,
    isLoading
  };
}
