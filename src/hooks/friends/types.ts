
// Types related to friend requests and friends
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at?: string;
  sender?: any;
  receiver?: any;
}

export interface FriendshipStatus {
  status: 'none' | 'friends' | 'pending-sent' | 'pending-received' | string;
  requestId: string | null;
}

export interface Friend {
  id?: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  avatar_url?: string;
  phoneNumber?: string;
}
