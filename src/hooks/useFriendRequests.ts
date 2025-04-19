
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  receiver?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useFriendRequests() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriendRequests = async () => {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) return;

    // Отримуємо запити в друзі без з'єднань
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${currentUser.user.id},receiver_id.eq.${currentUser.user.id}`);

    if (error) {
      toast.error('Помилка при завантаженні запитів у друзі');
      return;
    }

    if (!data || data.length === 0) {
      setFriendRequests([]);
      setFriends([]);
      setIsLoading(false);
      return;
    }

    // Збираємо унікальні ідентифікатори користувачів
    const userIds = new Set<string>();
    data.forEach(request => {
      userIds.add(request.sender_id);
      userIds.add(request.receiver_id);
    });

    // Отримуємо інформацію про всіх користувачів одним запитом
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds));

    if (usersError) {
      toast.error('Помилка при завантаженні інформації про користувачів');
      return;
    }

    // Створюємо карту користувачів для швидкого доступу
    const usersMap = new Map();
    usersData?.forEach(user => {
      usersMap.set(user.id, user);
    });

    // Додаємо інформацію про користувачів до запитів
    const enrichedRequests = data.map(request => {
      const sender = usersMap.get(request.sender_id);
      const receiver = usersMap.get(request.receiver_id);
      
      return {
        ...request,
        status: request.status as 'pending' | 'accepted' | 'rejected',
        sender: sender ? {
          id: sender.id,
          full_name: sender.full_name,
          avatar_url: sender.avatar_url
        } : undefined,
        receiver: receiver ? {
          id: receiver.id,
          full_name: receiver.full_name,
          avatar_url: receiver.avatar_url
        } : undefined
      };
    });

    setFriendRequests(enrichedRequests);
    
    // Відфільтруємо прийняті запити для відображення друзів
    const acceptedRequests = enrichedRequests.filter(req => req.status === 'accepted');
    const friendsList = acceptedRequests.map(req => {
      const isSender = req.sender_id === currentUser.user.id;
      return isSender ? req.receiver : req.sender;
    }).filter(Boolean);
    
    setFriends(friendsList);
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
