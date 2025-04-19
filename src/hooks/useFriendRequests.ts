
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
  } | null;
  receiver?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useFriendRequests() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    };
    
    getCurrentUser();
  }, []);

  const fetchFriendRequests = async () => {
    try {
      if (!currentUserId) return;
      
      setIsLoading(true);

      // Отримуємо запити в друзі
      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (requestsError) {
        toast.error('Помилка при завантаженні запитів у друзі');
        return;
      }

      if (!requestsData || requestsData.length === 0) {
        setFriendRequests([]);
        setFriends([]);
        setIsLoading(false);
        return;
      }

      // Перетворюємо статус запиту в типізований формат
      const typedRequests: FriendRequest[] = requestsData.map(request => ({
        ...request,
        status: request.status as 'pending' | 'accepted' | 'rejected',
      }));

      // Збираємо унікальні ідентифікатори користувачів
      const userIds = new Set<string>();
      typedRequests.forEach(request => {
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
      const usersMap = new Map<string, User>();
      usersData?.forEach(user => {
        usersMap.set(user.id, user);
      });

      // Додаємо інформацію про користувачів до запитів
      const enrichedRequests = typedRequests.map(request => {
        return {
          ...request,
          sender: usersMap.get(request.sender_id) || null,
          receiver: usersMap.get(request.receiver_id) || null
        };
      });

      setFriendRequests(enrichedRequests);
      
      // Відфільтруємо прийняті запити для відображення друзів
      const acceptedRequests = enrichedRequests.filter(req => req.status === 'accepted');
      const friendsList = acceptedRequests.map(req => {
        const isSender = req.sender_id === currentUserId;
        return isSender ? usersMap.get(req.receiver_id) : usersMap.get(req.sender_id);
      }).filter(Boolean) as User[];
      
      setFriends(friendsList);
    } catch (error) {
      console.error('Помилка при завантаженні запитів у друзі:', error);
      toast.error('Щось пішло не так при завантаженні даних');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchFriendRequests();
    }
  }, [currentUserId]);

  const sendFriendRequest = async (receiverId: string) => {
    try {
      if (!currentUserId) {
        toast.error('Ви повинні увійти в систему');
        return;
      }

      // Перевіряємо чи вже існує запит
      const { data: existingRequests } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`);

      if (existingRequests && existingRequests.length > 0) {
        const request = existingRequests[0];
        if (request.status === 'pending') {
          toast.info('Запит у друзі вже надіслано');
        } else if (request.status === 'accepted') {
          toast.info('Ви вже друзі');
        } else {
          toast.info('Запит було відхилено раніше');
        }
        return;
      }

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) {
        console.error('Помилка при надсиланні запиту:', error);
        if (error.code === '23505') {
          toast.error('Запит у друзі вже надіслано');
        } else {
          toast.error('Помилка при надсиланні запиту');
        }
        return;
      }

      toast.success('Запит у друзі надіслано');
      await fetchFriendRequests();
    } catch (error) {
      console.error('Помилка при надсиланні запиту:', error);
      toast.error('Помилка при надсиланні запиту у друзі');
    }
  };

  const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
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
    } catch (error) {
      toast.error('Помилка при обробці запиту');
      console.error(error);
    }
  };

  return {
    friendRequests,
    friends,
    isLoading,
    sendFriendRequest,
    respondToFriendRequest,
    refreshFriendRequests: fetchFriendRequests
  };
}
