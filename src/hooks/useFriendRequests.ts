
import { useFetchFriends } from './friends/useFetchFriends';
import { useFriendActions } from './friends/useFriendActions';
import { useFriendshipStatus } from './friends/useFriendshipStatus';
import { useEffect } from 'react';

export function useFriendRequests() {
  // Use the three sub-hooks together
  const {
    friendRequests,
    setFriendRequests,
    friends,
    setFriends,
    blockedUsers,
    isLoading,
    refreshFriendRequests
  } = useFetchFriends();

  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    respondToFriendRequest,
    removeFriend,
    blockUser,
    unblockUser
  } = useFriendActions();

  const {
    checkFriendshipStatus
  } = useFriendshipStatus({
    friendRequests
  });

  useEffect(() => {
    refreshFriendRequests();
  }, [refreshFriendRequests]);

  // Return all the functionality combined
  return {
    friendRequests,
    friends,
    blockedUsers,
    isLoading,
    refreshFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    respondToFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    checkFriendshipStatus
  };
}
