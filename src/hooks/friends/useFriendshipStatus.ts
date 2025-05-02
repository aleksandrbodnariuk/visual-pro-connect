
import { useCallback } from 'react';
import { FriendRequest, FriendshipStatus } from './types';

interface UseFriendshipStatusProps {
  friendRequests: FriendRequest[];
}

export function useFriendshipStatus({ friendRequests }: UseFriendshipStatusProps) {
  // Функція для перевірки статусу дружби
  const checkFriendshipStatus = useCallback((userId: string): FriendshipStatus => {
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

  return { checkFriendshipStatus };
}
