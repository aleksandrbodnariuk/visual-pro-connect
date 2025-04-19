
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export function useFriendRequests() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriendRequests = async () => {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${currentUser.user.id},receiver_id.eq.${currentUser.user.id}`);

    if (error) {
      toast.error('Помилка при завантаженні запитів у друзі');
      return;
    }

    setFriendRequests(data || []);
  };

  const sendFriendRequest = async (receiverId: string) => {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      toast.error('Ви повинні увійти в систему');
      return;
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: currentUser.user.id,
        receiver_id: receiverId,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Запит у друзі вже надіслано');
      } else {
        toast.error('Помилка при надсиланні запиту');
      }
      return;
    }

    toast.success('Запит у друзі надіслано');
    await fetchFriendRequests();
  };

  const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status })
      .match({ id: requestId });

    if (error) {
      toast.error('Помилка при обробці запиту');
      return;
    }

    toast.success(status === 'accepted' ? 'Запит прийнято' : 'Запит відхилено');
    await fetchFriendRequests();
  };

  useEffect(() => {
    fetchFriendRequests();
    setIsLoading(false);
  }, []);

  return {
    friendRequests,
    friends,
    isLoading,
    sendFriendRequest,
    respondToFriendRequest
  };
}
