
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';

export async function syncUserToSupabase(user: User): Promise<void> {
  if (!user.id) return;
  
  try {
    // Перевірка чи існує користувач в Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id);
      
    if (checkError) {
      console.error("Error checking user existence:", checkError);
      return;
    }
    
    // Якщо користувача не існує або результат порожній, створюємо нового
    if (!existingUser || existingUser.length === 0) {
      // Перевіряємо чи існує користувач з таким телефоном
      const { data: phoneCheck, error: phoneError } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', user.phoneNumber || user.phone_number || '');
        
      if (phoneError) {
        console.error("Error checking phone existence:", phoneError);
      } else if (phoneCheck && phoneCheck.length > 0) {
        console.log("User with this phone already exists, updating instead of inserting");
        
        // Якщо користувач з таким телефоном існує, оновлюємо його дані
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: user.firstName && user.lastName ? 
              `${user.firstName} ${user.lastName}` : user.full_name || '',
            is_admin: user.isAdmin || user.is_admin || user.role === 'admin' || user.role === 'admin-founder',
            is_shareholder: user.isShareHolder || user.is_shareholder || user.role === 'shareholder',
            founder_admin: user.isFounder || user.founder_admin || user.role === 'admin-founder' || 
              (user.phoneNumber === '0507068007' || user.phone_number === '0507068007'),
            avatar_url: user.avatarUrl || user.avatar_url || '',
            password: user.password || 'defaultpassword',
            bio: user.bio || '',
            website: user.website || '',
            instagram: user.instagram || '',
            facebook: user.facebook || '',
            viber: user.viber || ''
          })
          .eq('phone_number', user.phoneNumber || user.phone_number || '');
          
        if (updateError) {
          console.error("Error updating existing user by phone:", updateError);
        }
        
        return;
      }
      
      // Створюємо нового користувача, якщо не знайдено за телефоном
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          full_name: user.firstName && user.lastName ? 
            `${user.firstName} ${user.lastName}` : user.full_name || '',
          phone_number: user.phoneNumber || user.phone_number || '',
          is_admin: user.isAdmin || user.is_admin || user.role === 'admin' || user.role === 'admin-founder',
          is_shareholder: user.isShareHolder || user.is_shareholder || user.role === 'shareholder',
          founder_admin: user.isFounder || user.founder_admin || user.role === 'admin-founder' || 
            (user.phoneNumber === '0507068007' || user.phone_number === '0507068007'),
          avatar_url: user.avatarUrl || user.avatar_url || '',
          password: user.password || 'defaultpassword',
          bio: user.bio || '',
          website: user.website || '',
          instagram: user.instagram || '',
          facebook: user.facebook || '',
          viber: user.viber || ''
        });
        
      if (insertError) {
        console.error("Error inserting user to Supabase:", insertError);
      }
    } else {
      // Оновлюємо існуючого користувача з останніми даними
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: user.firstName && user.lastName ? 
            `${user.firstName} ${user.lastName}` : user.full_name || '',
          phone_number: user.phoneNumber || user.phone_number || '',
          is_admin: user.isAdmin || user.is_admin || user.role === 'admin' || user.role === 'admin-founder',
          is_shareholder: user.isShareHolder || user.is_shareholder || user.role === 'shareholder',
          founder_admin: user.isFounder || user.founder_admin || user.role === 'admin-founder' || 
            (user.phoneNumber === '0507068007' || user.phone_number === '0507068007'),
          avatar_url: user.avatarUrl || user.avatar_url || '',
          password: user.password,
          bio: user.bio || '',
          website: user.website || '',
          instagram: user.instagram || '',
          facebook: user.facebook || '',
          viber: user.viber || ''
        })
        .eq('id', user.id);
        
      if (updateError) {
        console.error("Error updating user in Supabase:", updateError);
      }
    }
  } catch (error) {
    console.error(`Error synchronizing user ${user.id}:`, error);
  }
}

export async function syncAllUsersToSupabase(): Promise<User[]> {
  try {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    if (allUsers && allUsers.length > 0) {
      for (const user of allUsers) {
        await syncUserToSupabase(user);
      }
      
      // Отримуємо останні дані користувачів з Supabase
      const { data: latestUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && latestUsers) {
        console.log("Latest users from Supabase:", latestUsers);
        
        // Оновлюємо localStorage останніми даними
        const formattedUsers = latestUsers.map(formatUserFromSupabase);
        localStorage.setItem('users', JSON.stringify(formattedUsers));
        return formattedUsers;
      }
    }
    return allUsers;
  } catch (error) {
    console.error("Error syncing users:", error);
    return [];
  }
}

export function formatUserFromSupabase(user: any): User {
  return {
    ...user,
    firstName: user.full_name?.split(' ')[0] || '',
    lastName: user.full_name?.split(' ')[1] || '',
    avatarUrl: user.avatar_url,
    isAdmin: user.is_admin,
    isShareHolder: user.is_shareholder,
    isFounder: user.founder_admin,
    phoneNumber: user.phone_number,
    status: user.founder_admin ? "Адміністратор-засновник" : 
           user.is_admin ? "Адміністратор" :
           user.is_shareholder ? "Акціонер" : "Звичайний користувач",
    bio: user.bio || '',
    website: user.website || '',
    instagram: user.instagram || '',
    facebook: user.facebook || '',
    viber: user.viber || ''
  };
}
