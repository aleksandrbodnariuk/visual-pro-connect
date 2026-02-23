
import { useCallback } from 'react';
import { FriendRequest, FriendshipStatus } from './types';
import { useAuth } from '@/context/AuthContext';

interface UseFriendshipStatusProps {
  friendRequests: FriendRequest[];
}

export function useFriendshipStatus({ friendRequests }: UseFriendshipStatusProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const checkFriendshipStatus = useCallback((userId: string): FriendshipStatus => {
    if (!currentUserId || !userId) {
      return { status: 'none', requestId: null };
    }
    
    const friendRequest = friendRequests.find(
      request => 
        (request.sender_id === currentUserId && request.receiver_id === userId) || 
        (request.sender_id === userId && request.receiver_id === currentUserId)
    );
    
    if (!friendRequest) {
      return { status: 'none', requestId: null };
    }
    
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
