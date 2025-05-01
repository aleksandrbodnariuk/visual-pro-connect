
import { useState, useEffect, useCallback } from 'react';
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
      // Перевіряємо спочатку localStorage, оскільки Supabase може бути не підключений
      const userJSON = localStorage.getItem("currentUser");
      if (userJSON) {
        try {
          const user = JSON.parse(userJSON);
          setCurrentUserId(user.id);
        } catch (error) {
          console.error("Помилка при парсингу JSON користувача:", error);
        }
      } else {
        // Якщо немає в localStorage, спробуємо отримати з Supabase
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            setCurrentUserId(data.user.id);
          }
        } catch (error) {
          console.error("Помилка при отриманні даних користувача з Supabase:", error);
        }
      }
    };
    
    getCurrentUser();
  }, []);

  const fetchFriendRequests = useCallback(async () => {
    try {
      if (!currentUserId) return;
      
      setIsLoading(true);

      let requests;
      let users;
      
      try {
        // Спроба отримати дані з Supabase
        const { data: requestsData, error: requestsError } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
        
        if (requestsError) throw requestsError;
        requests = requestsData || [];
        
        // Отримуємо інформацію про користувачів
        const userIds = new Set<string>();
        requests.forEach((req: any) => {
          userIds.add(req.sender_id);
          userIds.add(req.receiver_id);
        });
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIds));
          
        if (usersError) throw usersError;
        users = usersData || [];
        
      } catch (supabaseError) {
        console.warn("Помилка при завантаженні даних з Supabase, використовуємо локальні дані:", supabaseError);
        
        // Використовуємо дані з localStorage як запасний варіант
        const localRequests = JSON.parse(localStorage.getItem("friendRequests") || "[]");
        requests = localRequests;
        
        const localUsers = JSON.parse(localStorage.getItem("users") || "[]");
        users = localUsers;
      }

      // Перетворюємо статус запиту в типізований формат
      const typedRequests: FriendRequest[] = requests.map((request: any) => ({
        ...request,
        id: request.id || `local_${Date.now()}_${Math.random()}`,
        status: request.status as 'pending' | 'accepted' | 'rejected',
      }));

      // Створюємо карту користувачів для швидкого доступу
      const usersMap = new Map<string, User>();
      users?.forEach((user: any) => {
        const userData = {
          id: user.id,
          full_name: user.full_name || `${user.firstName || ''} ${user.lastName || ''}`,
          avatar_url: user.avatar_url || user.avatarUrl
        };
        usersMap.set(user.id, userData);
      });

      // Додаємо інформацію про користувачів до запитів
      const enrichedRequests = typedRequests.map((request) => {
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
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      fetchFriendRequests();
    }
  }, [currentUserId, fetchFriendRequests]);

  const sendFriendRequest = async (receiverId: string) => {
    try {
      if (!currentUserId) {
        toast.error('Ви повинні увійти в систему');
        return;
      }

      // Перевіряємо чи вже існує запит
      let existingRequests;
      let success = false;
      
      try {
        // Спроба використати Supabase
        const { data, error } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`);
        
        if (error) throw error;
        existingRequests = data;
        
        if (existingRequests && existingRequests.length > 0) {
          // Запит уже існує
        } else {
          // Створюємо новий запит
          const { error: insertError } = await supabase
            .from('friend_requests')
            .insert({
              sender_id: currentUserId,
              receiver_id: receiverId,
              status: 'pending'
            });
            
          if (insertError) throw insertError;
          success = true;
        }
      } catch (supabaseError) {
        console.warn("Помилка при взаємодії з Supabase, використовуємо локальне збереження:", supabaseError);
        
        // Використовуємо localStorage як запасний варіант
        const localRequests = JSON.parse(localStorage.getItem("friendRequests") || "[]");
        existingRequests = localRequests.filter((req: any) => 
          (req.sender_id === currentUserId && req.receiver_id === receiverId) || 
          (req.sender_id === receiverId && req.receiver_id === currentUserId)
        );
        
        if (existingRequests.length > 0) {
          // Запит уже існує
        } else {
          // Створюємо новий запит в localStorage
          const newRequest = {
            id: `local_${Date.now()}`,
            sender_id: currentUserId,
            receiver_id: receiverId,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          localRequests.push(newRequest);
          localStorage.setItem("friendRequests", JSON.stringify(localRequests));
          success = true;
        }
      }

      // Обробляємо результати
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

      if (success) {
        toast.success('Запит у друзі надіслано');
        await fetchFriendRequests();
      }
    } catch (error) {
      console.error('Помилка при надсиланні запиту:', error);
      toast.error('Помилка при надсиланні запиту у друзі');
    }
  };

  const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      let success = false;
      
      try {
        // Спроба використати Supabase
        const { error } = await supabase
          .from('friend_requests')
          .update({ status })
          .match({ id: requestId });
          
        if (error) throw error;
        success = true;
      } catch (supabaseError) {
        console.warn("Помилка при взаємодії з Supabase, використовуємо локальне збереження:", supabaseError);
        
        // Використовуємо localStorage як запасний варіант
        const localRequests = JSON.parse(localStorage.getItem("friendRequests") || "[]");
        const updatedRequests = localRequests.map((req: any) => {
          if (req.id === requestId) {
            return { ...req, status, updated_at: new Date().toISOString() };
          }
          return req;
        });
        
        localStorage.setItem("friendRequests", JSON.stringify(updatedRequests));
        success = true;
      }

      if (success) {
        toast.success(status === 'accepted' ? 'Запит прийнято' : 'Запит відхилено');
        await fetchFriendRequests();
      } else {
        toast.error('Не вдалося обробити запит');
      }
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
