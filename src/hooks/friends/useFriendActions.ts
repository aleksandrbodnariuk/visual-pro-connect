
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FriendRequest, FriendRequestStatus, Friend } from './types';

interface UseFriendActionsProps {
  friendRequests: FriendRequest[];
  setFriendRequests: React.Dispatch<React.SetStateAction<FriendRequest[]>>;
  friends: Friend[];
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
  refreshFriendRequests: () => Promise<void>;
}

export function useFriendActions({
  friendRequests,
  setFriendRequests,
  friends,
  setFriends,
  refreshFriendRequests
}: UseFriendActionsProps) {

  // Send a friend request to another user
  const sendFriendRequest = useCallback(async (receiverId: string) => {
    if (!receiverId) {
      toast.error("Не вдалося відправити запит. Отримувач не вказаний.");
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser.id) {
      toast.error("Авторизуйтесь щоб відправляти запити у друзі.");
      return;
    }

    try {
      // Check if a request already exists
      const existingRequest = friendRequests.find(
        req => (req.sender_id === currentUser.id && req.receiver_id === receiverId) ||
               (req.sender_id === receiverId && req.receiver_id === currentUser.id)
      );

      if (existingRequest) {
        toast.error("Запит вже відправлено або ви вже є друзями.");
        return;
      }

      // Create new request object
      const newRequest: FriendRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender_id: currentUser.id,
        receiver_id: receiverId,
        status: 'pending' as FriendRequestStatus,
        sender: currentUser,
        created_at: new Date().toISOString()
      };

      // Try to add the request to Supabase
      const { data, error } = await supabase
        .from('friend_requests')
        .insert([
          {
            sender_id: currentUser.id,
            receiver_id: receiverId,
            status: 'pending'
          }
        ])
        .select();

      if (error) {
        console.error("Error adding friend request to Supabase:", error);
        // Continue with local storage approach if Supabase fails
      }

      // Update local state and storage
      const updatedRequests = [...friendRequests, newRequest];
      setFriendRequests(updatedRequests as FriendRequest[]);
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));

      // Update UI
      toast.success("Запит у друзі відправлено!");
      
      // Refresh requests
      await refreshFriendRequests();
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Помилка при відправленні запиту у друзі.");
    }
  }, [friendRequests, setFriendRequests, refreshFriendRequests]);

  // Respond to a friend request (accept or reject)
  const respondToFriendRequest = useCallback(async (requestId: string, status: FriendRequestStatus) => {
    if (!requestId) {
      toast.error("ID запиту не вказаний.");
      return;
    }

    try {
      // Find the request in the local state
      const request = friendRequests.find(req => req.id === requestId);
      
      if (!request) {
        toast.error("Запит не знайдено.");
        return;
      }

      // Update request in Supabase
      const { error } = await supabase
        .from('friend_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) {
        console.error("Error updating friend request in Supabase:", error);
        // Continue with local storage approach
      }

      // Update request in local state
      const updatedRequests = friendRequests.map(req => 
        req.id === requestId ? { ...req, status } : req
      );
      
      setFriendRequests(updatedRequests);
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));

      // If request was accepted, add the user to friends list
      if (status === 'accepted') {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const newFriend = request.sender_id === currentUser.id ? 
          request.receiver : request.sender;
        
        if (newFriend && !friends.some(friend => friend?.id === newFriend.id)) {
          const updatedFriends = [...friends, newFriend];
          setFriends(updatedFriends as Friend[]);
        }
      }

      // Show success message
      const message = status === 'accepted' ? 
        "Запит у друзі прийнято!" : "Запит у друзі відхилено.";
      toast.success(message);
      
      // Refresh the list
      await refreshFriendRequests();
    } catch (error) {
      console.error("Error responding to friend request:", error);
      toast.error("Помилка при обробці запиту у друзі.");
    }
  }, [friendRequests, setFriendRequests, friends, setFriends, refreshFriendRequests]);

  // Remove a user from friends
  const removeFriend = useCallback(async (friendId: string) => {
    if (!friendId) return;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser.id) {
      toast.error("Авторизуйтесь щоб виконати цю дію.");
      return;
    }
    
    try {
      // Find the friend request
      const request = friendRequests.find(
        req => (req.sender_id === currentUser.id && req.receiver_id === friendId) ||
               (req.sender_id === friendId && req.receiver_id === currentUser.id)
      );
      
      if (!request) {
        toast.error("Запис про дружбу не знайдено.");
        return;
      }
      
      // Update the request status in Supabase
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);
      
      if (error) {
        console.error("Error removing friend in Supabase:", error);
      }
      
      // Update local state
      const updatedRequests = friendRequests.map(req =>
        req.id === request.id ? { ...req, status: 'rejected' as FriendRequestStatus } : req
      );
      setFriendRequests(updatedRequests);
      localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
      
      // Remove from friends list
      const updatedFriends = friends.filter(friend => friend?.id !== friendId);
      setFriends(updatedFriends);
      
      toast.success("Користувача видалено з друзів.");
      
      // Refresh the lists
      await refreshFriendRequests();
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Помилка при видаленні з друзів.");
    }
  }, [friendRequests, setFriendRequests, friends, setFriends, refreshFriendRequests]);

  return {
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend
  };
}
