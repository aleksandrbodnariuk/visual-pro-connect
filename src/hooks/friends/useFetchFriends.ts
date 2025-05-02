
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FriendRequest, Friend } from './types';

export function useFetchFriends() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
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
            await syncLocalStorageToSupabase(storedFriendRequests, currentUser.id);
            
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

  // Допоміжна функція для синхронізації даних з localStorage до Supabase
  const syncLocalStorageToSupabase = async (requests: any[], userId: string) => {
    for (const request of requests) {
      try {
        // Перевіряємо чи існує вже такий запит в Supabase
        const { data: existingRequest, error: checkError } = await supabase
          .from('friend_requests')
          .select('id')
          .eq('id', request.id)
          .maybeSingle();
          
        if (checkError) {
          console.error('Помилка перевірки існування запиту:', checkError);
          continue;
        }
        
        if (!existingRequest) {
          await supabase
            .from('friend_requests')
            .insert({
              id: request.id,
              sender_id: request.sender_id,
              receiver_id: request.receiver_id,
              status: request.status,
              created_at: request.created_at || new Date().toISOString()
            });
        }
      } catch (insertError) {
        console.error('Помилка при створенні запиту у друзі в Supabase:', insertError);
      }
    }
  };

  return {
    friendRequests,
    setFriendRequests,
    friends,
    setFriends,
    isLoading,
    refreshFriendRequests
  };
}
