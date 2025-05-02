
export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  phoneNumber?: string;
  phone_number?: string;
  avatarUrl?: string;
  avatar_url?: string;
  isAdmin?: boolean;
  is_admin?: boolean;
  isShareHolder?: boolean;
  is_shareholder?: boolean;
  isFounder?: boolean;
  founder_admin?: boolean;
  role?: string;
  status?: string;
  password?: string;
  email?: string;
  city?: string;
  country?: string;
  categories?: string[];
  created_at?: string;
}

export interface UseUsersReturnType {
  users: User[];
  isFounder: boolean;
  isLoading: boolean;
  deleteUser: (userId: string) => Promise<void>;
  changeUserStatus: (userId: string, newStatus: string) => Promise<void>;
  toggleShareholderStatus: (userId: string, isShareHolder: boolean) => Promise<void>;
  refreshUsers: () => Promise<void>;
}
