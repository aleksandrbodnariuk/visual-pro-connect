
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  role?: string;
  status?: string;
  bio?: string;
  country?: string;
  city?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  viber?: string;
  title?: string;
  isAdmin?: boolean;
  isFounder?: boolean;
  isShareHolder?: boolean;
  categories?: string[];
  shares?: number;
  percentage?: number;
  profit?: number;
  
  // Fields for Supabase DB compatibility (snake_case)
  avatar_url?: string;
  banner_url?: string;
  full_name?: string;
  created_at?: string;
  founder_admin?: boolean;
  is_admin?: boolean;
  is_shareholder?: boolean;
  phone_number?: string;
}

// Type for user list
export interface UserForList {
  id: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string;
  role?: string;
  status?: string;
}

// Return type for useUsers hook
export interface UseUsersReturnType {
  users: User[];
  isFounder: boolean;
  isLoading: boolean;
  deleteUser: (userId: string) => Promise<void>;
  changeUserStatus: (userId: string, newStatus: string) => Promise<void>;
  toggleShareholderStatus: (userId: string, isShareHolder: boolean) => Promise<void>;
  refreshUsers: () => Promise<void>;
}
