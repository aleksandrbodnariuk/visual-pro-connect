import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FriendRequest, Friend, FriendRequestStatus } from './types';
import { useAuth } from '@/context/AuthContext';

export function useFetchFriends() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const refreshFriendRequests = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    const userId = currentUserId;
    setIsLoading(true);
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (requestsError) {
        console.error('❌ Error fetching friend requests from Supabase:', requestsError);
        return;
      }
      
      if (!requestsData || requestsData.length === 0) {
        setFriendRequests([]);
        setFriends([]);
        setBlockedUsers([]);
        return;
      }
      
      // Load user data for senders/receivers
      const userIds = new Set<string>();
      requestsData.forEach(req => {
        userIds.add(req.sender_id);
        userIds.add(req.receiver_id);
      });
      
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(userIds) });
      
      if (usersError) {
        console.error('❌ Error fetching user profiles:', usersError);
      }
      
      const usersMap = new Map();
      if (usersData) {
        usersData.forEach((user: any) => usersMap.set(user.id, user));
      }
      
      const typedRequests = requestsData.map(req => ({
        ...req,
        status: req.status as FriendRequestStatus,
        sender: usersMap.get(req.sender_id) || { id: req.sender_id, full_name: 'Користувач' },
        receiver: usersMap.get(req.receiver_id) || { id: req.receiver_id, full_name: 'Користувач' }
      })) as FriendRequest[];
    
      setFriendRequests(typedRequests);
      
      const friendsList = typedRequests
        .filter(request => request.status === 'accepted')
        .map(request => {
          if (request.sender_id === userId) return request.receiver;
          else if (request.receiver_id === userId) return request.sender;
          return null;
        })
        .filter(friend => friend !== null);
        
      setFriends(friendsList as Friend[]);

      const blockedList = typedRequests
        .filter(request => request.status === 'blocked' && request.sender_id === userId)
        .map(request => request.receiver)
        .filter(user => user !== null);
      
      setBlockedUsers(blockedList as Friend[]);
    } catch (error) {
      console.error('❌ Error in refreshFriendRequests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Real-time subscription for friend_requests changes
  useEffect(() => {
    if (!currentUserId) return;
    
    const channel = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => { refreshFriendRequests(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, refreshFriendRequests]);

  // Initial fetch when user is available
  useEffect(() => {
    if (currentUserId) {
      refreshFriendRequests();
    }
  }, [currentUserId, refreshFriendRequests]);

  return {
    friendRequests,
    setFriendRequests,
    friends,
    setFriends,
    blockedUsers,
    isLoading,
    refreshFriendRequests
  };
}
