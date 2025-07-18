
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FriendRequest, Friend, FriendRequestStatus } from './types';

export function useFetchFriends() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshFriendRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      if (!currentUser || !currentUser.id) {
        console.error("No logged in user found");
        setIsLoading(false);
        return;
      }

      console.log("Refreshing friend requests for user:", currentUser.id);

      // Спочатку завантажуємо з localStorage
      const storedRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
      console.log("Stored requests from localStorage:", storedRequests);
      
      const typedStoredRequests = storedRequests.map((req: any) => ({
        ...req,
        status: req.status as FriendRequestStatus
      })) as FriendRequest[];
      
      setFriendRequests(typedStoredRequests);

      // ЗАВЖДИ спробуємо завантажити з Supabase для актуальних даних
      try {
        const { data: requestsData, error: requestsError } = await supabase
          .from('friend_requests')
          .select(`
            *,
            sender:users!friend_requests_sender_id_fkey(*),
            receiver:users!friend_requests_receiver_id_fkey(*)
          `)
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

        if (requestsError) {
          console.error('Error fetching friend requests from Supabase:', requestsError);
          // У випадку помилки використовуємо localStorage
        } else if (requestsData) {
          console.log("Requests from Supabase:", requestsData);
          
          const typedRequests = requestsData.map(req => ({
            ...req,
            status: req.status as FriendRequestStatus,
            sender: req.sender || { id: req.sender_id, full_name: 'Користувач', firstName: 'Невідомий', lastName: '' },
            receiver: req.receiver || { id: req.receiver_id, full_name: 'Користувач', firstName: 'Невідомий', lastName: '' }
          })) as FriendRequest[];
          
          setFriendRequests(typedRequests);
          localStorage.setItem('friendRequests', JSON.stringify(typedRequests));
          
          // Витягуємо друзів з прийнятих запитів
          const currentUserId = currentUser.id;
          const friendsList = typedRequests
            .filter(request => request.status === 'accepted')
            .map(request => {
              // Якщо я відправник запиту, то друг - це отримувач
              if (request.sender_id === currentUserId) {
                return request.receiver;
              } 
              // Якщо я отримувач запиту, то друг - це відправник
              else if (request.receiver_id === currentUserId) {
                return request.sender;
              }
              return null;
            })
            .filter(friend => friend !== null);
            
          setFriends(friendsList as Friend[]);
          
          // Якщо дані з Supabase завантажились успішно, не використовуємо localStorage
          return;
        }
      } catch (supabaseError) {
        console.warn("Supabase not available, using localStorage:", supabaseError);
      }
      
      // Використовуємо localStorage тільки якщо Supabase недоступний або дані не завантажились
      console.log("Using localStorage friend requests");
      setFriendRequests(typedStoredRequests);

      // Завантажуємо користувачів з localStorage для формування списку друзів
      const usersFromLocalStorage = JSON.parse(localStorage.getItem('users') || '[]');
      console.log("Users from localStorage:", usersFromLocalStorage);
      
      if (usersFromLocalStorage.length > 0) {
        const currentUserId = currentUser.id;
        
        // Отримуємо актуальні запити
        const currentRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
        console.log("Current requests for friends extraction:", currentRequests);
        
        // Витягуємо друзів з прийнятих запитів
        const localStorageFriends = currentRequests
          .filter((request: any) => request.status === 'accepted')
          .map((request: any) => {
            console.log("Processing accepted request:", request);
            // Якщо я відправник запиту, то друг - це отримувач
            if (request.sender_id === currentUserId) {
              const friend = usersFromLocalStorage.find((user: any) => user.id === request.receiver_id);
              console.log("Found friend (receiver):", friend);
              return friend;
            } 
            // Якщо я отримувач запиту, то друг - це відправник
            else if (request.receiver_id === currentUserId) {
              const friend = usersFromLocalStorage.find((user: any) => user.id === request.sender_id);
              console.log("Found friend (sender):", friend);
              return friend;
            }
            return null;
          })
          .filter((friend: any) => friend !== undefined && friend !== null);
          
        console.log("Final friends list:", localStorageFriends);
        setFriends(localStorageFriends as Friend[]);
      }
    } catch (error) {
      console.error('Error in refreshFriendRequests:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    friendRequests,
    setFriendRequests,
    friends,
    setFriends,
    isLoading,
    refreshFriendRequests
  };
}
