
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FriendRequest, Friend } from './types';

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

      // Fetch friend requests from Supabase
      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*, sender:sender_id(*), receiver:receiver_id(*)')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (requestsError) {
        console.error('Error fetching friend requests:', requestsError);
        // Use local storage if Supabase fails
        const storedRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
        setFriendRequests(storedRequests as FriendRequest[]);
      } else {
        // Ensure data is correctly typed before setting state
        const typedRequests = requestsData.map(req => ({
          ...req,
          status: req.status as FriendRequestStatus
        })) as FriendRequest[];
        
        setFriendRequests(typedRequests);
        // Update localStorage
        localStorage.setItem('friendRequests', JSON.stringify(typedRequests));
      }

      // Extract friends from accepted requests
      const acceptedFriends = requestsData
        ?.filter(request => request.status === 'accepted')
        .map(request => {
          if (request.sender_id === currentUser.id) {
            return request.receiver;
          } else {
            return request.sender;
          }
        })
        .filter(friend => friend !== null);

      if (acceptedFriends) {
        setFriends(acceptedFriends as Friend[]);
      }

      // Fetch from local storage as fallback
      const usersFromLocalStorage = JSON.parse(localStorage.getItem('users') || '[]');
      
      if (usersFromLocalStorage.length > 0) {
        const currentUserId = currentUser.id;
        const storedRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
        
        const typedStoredRequests = storedRequests.map((req: any) => ({
          ...req,
          status: req.status as FriendRequestStatus
        })) as FriendRequest[];
        
        setFriendRequests(typedStoredRequests);
        
        // Extract friends from localStorage
        const localStorageFriends = typedStoredRequests
          .filter(request => request.status === 'accepted')
          .map(request => {
            if (request.sender_id === currentUserId) {
              return usersFromLocalStorage.find((user: any) => user.id === request.receiver_id);
            } else {
              return usersFromLocalStorage.find((user: any) => user.id === request.sender_id);
            }
          })
          .filter((friend: any) => friend !== undefined);
          
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
