
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  avatarUrl?: string;
  bannerUrl?: string; // Додаємо підтримку URL банера
  role?: string;
  status?: string;
  bio?: string;
  country?: string;
  city?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  viber?: string;
  title?: string; // Додаємо підтримку заголовка
  isAdmin?: boolean;
  isFounder?: boolean;
  isShareHolder?: boolean;
  categories?: string[];
  
  // Додаємо підтримку полів з базою даних Supabase (в snake_case)
  avatar_url?: string;
  banner_url?: string; // Додаємо для сумісності з БД
  full_name?: string;
  created_at?: string;
  founder_admin?: boolean;
  is_admin?: boolean;
  is_shareholder?: boolean;
  phone_number?: string;
}
