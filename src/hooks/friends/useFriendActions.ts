
import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FriendRequest, Friend, FriendRequestStatus } from './types';

interface UseFriendActionsProps {
  friendRequests: FriendRequest[];
  setFriendRequests: (requests: FriendRequest[]) => void;
  friends: Friend[];
  setFriends: (friends: Friend[]) => void;
  refreshFriendRequests: () => Promise<void>;
}

export function useFriendActions({
  friendRequests,
  setFriendRequests,
  friends,
  setFriends,
  refreshFriendRequests
}: UseFriendActionsProps) {
  
  const sendFriendRequest = useCallback(async (receiverId: string) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      if (!currentUser || !currentUser.id) {
        toast.error('Необхідно авторизуватись');
        return;
      }
      
      // Перевіряємо, чи не намагається користувач додати самого себе
      if (currentUser.id === receiverId) {
        toast.error('Ви не можете додати самого себе в друзі');
        return;
      }
      
      // Перевіряємо, чи не існує вже запит (з обох сторін)
      const existingRequest = friendRequests.find(
        request => 
          (request.sender_id === currentUser.id && request.receiver_id === receiverId) || 
          (request.sender_id === receiverId && request.receiver_id === currentUser.id)
      );
      
      if (existingRequest) {
        if (existingRequest.status === 'accepted') {
          toast.info('Цей користувач вже є у вашому списку друзів');
        } else if (existingRequest.status === 'pending') {
          toast.info('Запит на додавання у друзі вже надіслано');
        } else {
          toast.info('Запит у друзі вже існує');
        }
        return;
      }
      
      // Створюємо новий запит у Supabase
      try {
        const requestId = crypto.randomUUID();
        const { error } = await supabase
          .from('friend_requests')
          .insert({
            id: requestId,
            sender_id: currentUser.id,
            receiver_id: receiverId,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Помилка при створенні запиту в Supabase:', error);
          throw error;
        }
        
        // Додатково зберігаємо в localStorage для сумісності
        const newRequest = {
          id: requestId,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          status: 'pending',
          sender: currentUser,
          created_at: new Date().toISOString()
        };
        
        const updatedRequests = [...friendRequests, newRequest];
        setFriendRequests(updatedRequests);
        localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
        
        toast.success('Запит у друзі надіслано');
      } catch (supabaseError) {
        console.warn('Помилка при створенні запиту в Supabase:', supabaseError);
        
        // Створюємо запис в localStorage
        const requestId = crypto.randomUUID();
        const newRequest = {
          id: requestId,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          status: 'pending',
          sender: currentUser,
          created_at: new Date().toISOString()
        };
        
        const updatedRequests = [...friendRequests, newRequest];
        setFriendRequests(updatedRequests);
        localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
        
        toast.success('Запит у друзі надіслано');
      }
    } catch (error) {
      console.error('Помилка при надсиланні запиту у друзі:', error);
      toast.error('Не вдалося надіслати запит');
    }
  }, [friendRequests, setFriendRequests]);

  const respondToFriendRequest = useCallback(async (requestId: string, newStatus: FriendRequestStatus) => {
    try {
      // Спочатку оновлюємо в Supabase
      try {
        const { error } = await supabase
          .from('friend_requests')
          .update({ status: newStatus })
          .eq('id', requestId);
        
        if (error) {
          console.error('Помилка при оновленні статусу запиту в Supabase:', error);
          throw error;
        }
      } catch (supabaseError) {
        console.warn('Помилка при оновленні запиту у Supabase:', supabaseError);
      }
      
      // Оновлюємо в локальному стані
      const updatedRequests = friendRequests.map(request => {
        if (request.id === requestId) {
          return { ...request, status: newStatus };
        }
        return request;
      });
      
      setFriendRequests(updatedRequests);
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
      
      // Оновлюємо список друзів, якщо запит прийнято
      if (newStatus === 'accepted') {
        const acceptedRequest = friendRequests.find(request => request.id === requestId);
        
        if (acceptedRequest) {
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
          
          // Визначаємо, хто є нашим другом
          const friendUser = acceptedRequest.sender_id === currentUser.id 
            ? acceptedRequest.receiver
            : acceptedRequest.sender;
          
          if (friendUser) {
            const updatedFriends = [...friends, friendUser];
            setFriends(updatedFriends);
            localStorage.setItem('friends', JSON.stringify(updatedFriends));
            
            toast.success(`${friendUser.full_name || 'Користувача'} додано до друзів`);
          }
        }
      } else {
        toast.info('Запит відхилено');
      }
      
      await refreshFriendRequests();
    } catch (error) {
      console.error('Помилка при відповіді на запит у друзі:', error);
      toast.error('Не вдалося обробити запит');
    }
  }, [friendRequests, friends, setFriendRequests, setFriends, refreshFriendRequests]);

  const removeFriend = useCallback(async (friendId: string) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      // Шукаємо запит, який відповідає цьому другу
      const friendRequest = friendRequests.find(
        request => 
          (request.sender_id === currentUser.id && request.receiver_id === friendId) || 
          (request.sender_id === friendId && request.receiver_id === currentUser.id)
      );
      
      if (!friendRequest) {
        toast.error('Запис про дружбу не знайдено');
        return;
      }
      
      // Видаляємо у Supabase
      try {
        const { error } = await supabase
          .from('friend_requests')
          .delete()
          .eq('id', friendRequest.id);
          
        if (error) {
          console.error('Помилка при видаленні запису у Supabase:', error);
          throw error;
        }
      } catch (supabaseError) {
        console.warn('Помилка при видаленні запису у Supabase:', supabaseError);
      }
      
      // Оновлюємо локальні дані
      const updatedRequests = friendRequests.filter(request => request.id !== friendRequest.id);
      setFriendRequests(updatedRequests);
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
      
      const updatedFriends = friends.filter(friend => friend?.id !== friendId);
      setFriends(updatedFriends);
      localStorage.setItem('friends', JSON.stringify(updatedFriends));
      
      toast.success('Друга видалено зі списку');
    } catch (error) {
      console.error('Помилка при видаленні друга:', error);
      toast.error('Не вдалося видалити друга');
    }
  }, [friendRequests, friends, setFriendRequests, setFriends]);
  
  return {
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend
  };
}
