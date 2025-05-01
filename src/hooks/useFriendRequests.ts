
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useFriendRequests() {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFriendRequests = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (!currentUser || !currentUser.id) {
        console.warn('Не вдалося отримати дані поточного користувача');
        setFriendRequests([]);
        setFriends([]);
        setIsLoading(false);
        return;
      }
      
      // Спочатку спробуємо отримати дані з Supabase
      try {
        // Запит для отримання запитів у друзі
        const { data: supabaseFriendRequests, error: requestsError } = await supabase
          .from('friend_requests')
          .select('*, sender:sender_id(*), receiver:receiver_id(*)')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
        
        if (requestsError) {
          console.error('Помилка отримання запитів у друзі з Supabase:', requestsError);
          throw requestsError;
        }
        
        console.log('Запити в друзі з Supabase:', supabaseFriendRequests);
        
        if (supabaseFriendRequests && supabaseFriendRequests.length > 0) {
          // Зберігаємо в стейт та localStorage
          setFriendRequests(supabaseFriendRequests);
          localStorage.setItem('friendRequests', JSON.stringify(supabaseFriendRequests));
          
          // Фільтруємо підтверджені запити для списку друзів
          const acceptedRequests = supabaseFriendRequests.filter(
            request => request.status === 'accepted'
          );
          
          // Формуємо список друзів
          const friendsList = acceptedRequests.map(request => {
            if (request.sender_id === currentUser.id) {
              return request.receiver;
            } else {
              return request.sender;
            }
          });
          
          setFriends(friendsList);
          localStorage.setItem('friends', JSON.stringify(friendsList));
        } else {
          // Якщо немає даних у Supabase, перевіряємо localStorage
          const storedFriendRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
          
          // Перенесення даних з localStorage до Supabase
          if (storedFriendRequests.length > 0) {
            for (const request of storedFriendRequests) {
              try {
                await supabase
                  .from('friend_requests')
                  .insert({
                    id: request.id,
                    sender_id: request.sender_id,
                    receiver_id: request.receiver_id,
                    status: request.status,
                    created_at: request.created_at
                  })
                  .select();
              } catch (insertError) {
                console.error('Помилка при створенні запиту у друзі в Supabase:', insertError);
              }
            }
            
            // Повторний запит для отримання оновлених даних
            const { data: refreshedRequests } = await supabase
              .from('friend_requests')
              .select('*, sender:sender_id(*), receiver:receiver_id(*)')
              .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
              
            if (refreshedRequests && refreshedRequests.length > 0) {
              setFriendRequests(refreshedRequests);
              
              const acceptedRequests = refreshedRequests.filter(
                request => request.status === 'accepted'
              );
              
              const friendsList = acceptedRequests.map(request => {
                if (request.sender_id === currentUser.id) {
                  return request.receiver;
                } else {
                  return request.sender;
                }
              });
              
              setFriends(friendsList);
              
              localStorage.setItem('friendRequests', JSON.stringify(refreshedRequests));
              localStorage.setItem('friends', JSON.stringify(friendsList));
            } else {
              setFriendRequests(storedFriendRequests);
              
              // Формуємо список друзів із localStorage
              const acceptedRequests = storedFriendRequests.filter(
                (request: any) => request.status === 'accepted'
              );
              
              const friendsList = acceptedRequests.map((request: any) => {
                if (request.sender_id === currentUser.id) {
                  return request.receiver;
                } else {
                  return request.sender;
                }
              });
              
              setFriends(friendsList);
            }
          } else {
            setFriendRequests([]);
            setFriends([]);
          }
        }
      } catch (supabaseError) {
        console.warn('Помилка при отриманні даних з Supabase:', supabaseError);
        
        // Використовуємо дані з localStorage як запасний варіант
        const storedFriendRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
        setFriendRequests(storedFriendRequests);
        
        // Формуємо список друзів із localStorage
        const acceptedRequests = storedFriendRequests.filter(
          (request: any) => request.status === 'accepted'
        );
        
        const friendsList = acceptedRequests.map((request: any) => {
          if (request.sender_id === currentUser.id) {
            return request.receiver;
          } else {
            return request.sender;
          }
        });
        
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Помилка при оновленні запитів у друзі:', error);
      toast.error('Помилка при завантаженні списку друзів');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFriendRequests();
  }, [refreshFriendRequests]);

  const sendFriendRequest = async (receiverId: string) => {
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
  };

  const respondToFriendRequest = async (requestId: string, newStatus: 'accepted' | 'rejected') => {
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
  };

  const removeFriend = async (friendId: string) => {
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
  };
  
  // Функція для перевірки статусу дружби
  const checkFriendshipStatus = useCallback((userId: string) => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser || !currentUser.id || !userId) {
      return { status: 'none', requestId: null };
    }
    
    // Шукаємо запит у друзі між цими користувачами
    const friendRequest = friendRequests.find(
      request => 
        (request.sender_id === currentUser.id && request.receiver_id === userId) || 
        (request.sender_id === userId && request.receiver_id === currentUser.id)
    );
    
    if (!friendRequest) {
      return { status: 'none', requestId: null };
    }
    
    // Визначаємо напрямок запиту
    if (friendRequest.status === 'accepted') {
      return { status: 'friends', requestId: friendRequest.id };
    } else if (friendRequest.status === 'pending') {
      if (friendRequest.sender_id === currentUser.id) {
        return { status: 'pending-sent', requestId: friendRequest.id };
      } else {
        return { status: 'pending-received', requestId: friendRequest.id };
      }
    } else {
      return { status: friendRequest.status, requestId: friendRequest.id };
    }
  }, [friendRequests]);

  return {
    friendRequests,
    friends,
    isLoading,
    refreshFriendRequests,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    checkFriendshipStatus
  };
}
