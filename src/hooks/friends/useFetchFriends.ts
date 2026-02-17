import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FriendRequest, Friend, FriendRequestStatus } from './types';

export function useFetchFriends() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user from Supabase Auth
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshFriendRequests = useCallback(async () => {
    console.log("🔄 refreshFriendRequests called");
    
    // Get current user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("❌ No logged in user found");
      setIsLoading(false);
      return;
    }

    const userId = user.id;
    console.log("✅ Refreshing friend requests for user:", userId);
    
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
      
      console.log("📋 Requests from Supabase:", requestsData);
      
      if (!requestsData || requestsData.length === 0) {
        console.log("📋 No friend requests found");
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
      
      // Map users
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
    
      console.log("✅ Typed requests with users:", typedRequests);
      setFriendRequests(typedRequests);
      
      // Extract friends from accepted requests
      const friendsList = typedRequests
        .filter(request => request.status === 'accepted')
        .map(request => {
          if (request.sender_id === userId) {
            return request.receiver;
          } else if (request.receiver_id === userId) {
            return request.sender;
          }
          return null;
        })
        .filter(friend => friend !== null);
        
      setFriends(friendsList as Friend[]);
      console.log("✅ Friends list:", friendsList);

      // Extract blocked users
      const blockedList = typedRequests
        .filter(request => request.status === 'blocked' && request.sender_id === userId)
        .map(request => request.receiver)
        .filter(user => user !== null);
      
      setBlockedUsers(blockedList as Friend[]);
      console.log("🚫 Blocked users:", blockedList);
    } catch (error) {
      console.error('❌ Error in refreshFriendRequests:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time subscription for friend_requests changes
  useEffect(() => {
    if (!currentUserId) return;

    console.log("📡 Setting up real-time subscription for friend_requests");
    
    const channel = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests'
        },
        (payload) => {
          console.log('📥 Real-time friend request change:', payload);
          refreshFriendRequests();
        }
      )
      .subscribe((status) => {
        console.log("📡 Realtime subscription status:", status);
      });

    return () => {
      console.log("📡 Removing real-time subscription");
      supabase.removeChannel(channel);
    };
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
