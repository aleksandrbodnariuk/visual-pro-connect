
import { useCallback, useEffect, useState } from 'react';
import { FriendRequest, FriendshipStatus } from './types';
import { supabase } from '@/integrations/supabase/client';

interface UseFriendshipStatusProps {
  friendRequests: FriendRequest[];
}

export function useFriendshipStatus({ friendRequests }: UseFriendshipStatusProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user from Supabase Auth (не з localStorage!)
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

  // Функція для перевірки статусу дружби
  const checkFriendshipStatus = useCallback((userId: string): FriendshipStatus => {
    if (!currentUserId || !userId) {
      return { status: 'none', requestId: null };
    }
    
    // Шукаємо запит у друзі між цими користувачами
    const friendRequest = friendRequests.find(
      request => 
        (request.sender_id === currentUserId && request.receiver_id === userId) || 
        (request.sender_id === userId && request.receiver_id === currentUserId)
    );
    
    if (!friendRequest) {
      return { status: 'none', requestId: null };
    }
    
    // Визначаємо напрямок запиту
    if (friendRequest.status === 'accepted') {
      return { status: 'friends', requestId: friendRequest.id };
    } else if (friendRequest.status === 'pending') {
      if (friendRequest.sender_id === currentUserId) {
        return { status: 'pending-sent', requestId: friendRequest.id };
      } else {
        return { status: 'pending-received', requestId: friendRequest.id };
      }
    } else {
      return { status: friendRequest.status, requestId: friendRequest.id };
    }
  }, [friendRequests, currentUserId]);

  return { checkFriendshipStatus };
}
