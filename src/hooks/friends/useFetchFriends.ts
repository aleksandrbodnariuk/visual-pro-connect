
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

      // Спробуємо завантажити з Supabase
      try {
        const { data: requestsData, error: requestsError } = await supabase
          .from('friend_requests')
          .select('*, sender:sender_id(*), receiver:receiver_id(*)')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

        if (requestsError) {
          console.error('Error fetching friend requests from Supabase:', requestsError);
        } else if (requestsData && requestsData.length > 0) {
          console.log("Requests from Supabase:", requestsData);
          
          const typedRequests = requestsData.map(req => ({
            ...req,
            status: req.status as FriendRequestStatus
          })) as FriendRequest[];
          
          setFriendRequests(typedRequests);
          localStorage.setItem('friendRequests', JSON.stringify(typedRequests));
        }
      } catch (supabaseError) {
        console.warn("Supabase not available, using localStorage:", supabaseError);
      }

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
            if (request.sender_id === currentUserId) {
              const friend = usersFromLocalStorage.find((user: any) => user.id === request.receiver_id);
              console.log("Found friend (receiver):", friend);
              return friend;
            } else {
              const friend = usersFromLocalStorage.find((user: any) => user.id === request.sender_id);
              console.log("Found friend (sender):", friend);
              return friend;
            }
          })
          .filter((friend: any) => friend !== undefined);
          
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
