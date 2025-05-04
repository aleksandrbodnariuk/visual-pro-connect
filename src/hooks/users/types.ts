
export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  email?: string;
  phoneNumber?: string;
  phone_number?: string;
  password?: string;
  avatarUrl?: string;
  avatar_url?: string;
  bannerUrl?: string;
  banner_url?: string;
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  viber?: string;
  isAdmin?: boolean;
  is_admin?: boolean;
  isFounder?: boolean;
  founder_admin?: boolean;
  isShareHolder?: boolean;
  is_shareholder?: boolean;
  created_at?: string;
  role?: string;
  categories?: string[];
  status?: string;
  shares?: number;
  percentage?: number;
  profit?: number;
  title?: string; // Added this field
  city?: string;
  country?: string;
}

export interface UserForList {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  role?: string;
  status?: string;
}

// Define the return type for useUsers hook
export interface UseUsersReturnType {
  users: User[];
  isFounder: boolean;
  isLoading: boolean;
  deleteUser: (userId: string) => Promise<void>;
  changeUserStatus: (userId: string, newStatus: string) => Promise<void>;
  toggleShareholderStatus: (userId: string, isShareHolder: boolean) => Promise<void>;
  refreshUsers: () => Promise<void>;
}
