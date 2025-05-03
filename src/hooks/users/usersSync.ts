
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';

export async function syncUserToSupabase(user: User): Promise<void> {
  if (!user.id) return;
  
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking user existence:", checkError);
      return;
    }
    
    if (!existingUser) {
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
          // Include social profile fields
          bio: user.bio || '',
          website: user.website || '',
          instagram: user.instagram || '',
          facebook: user.facebook || '',
          viber: user.viber || ''
        });
        
      if (insertError) {
        console.error("Error inserting user to Supabase:", insertError);
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
      
      // Fetch the latest users data from Supabase
      const { data: latestUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && latestUsers) {
        console.log("Latest users from Supabase:", latestUsers);
        
        // Update localStorage with the latest data
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
    status: user.role === "admin-founder" ? "Адміністратор-засновник" : 
           user.role === "admin" ? "Адміністратор" :
           user.role === "moderator" ? "Модератор" :
           user.is_shareholder ? "Акціонер" : "Звичайний користувач",
    // Map social profile fields
    bio: user.bio,
    website: user.website,
    instagram: user.instagram,
    facebook: user.facebook,
    viber: user.viber
  };
}
