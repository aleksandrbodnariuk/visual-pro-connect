
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';

export async function syncUserToSupabase(user: User): Promise<void> {
  if (!user.id) return;
  
  try {
    // Only sync if user has admin access or is syncing their own data
    const { data: currentUserProfile } = await supabase.rpc('get_my_profile');
    const currentProfile = Array.isArray(currentUserProfile) ? currentUserProfile[0] : currentUserProfile;
    const isAdmin = currentProfile?.is_admin || currentProfile?.founder_admin;
    const isSelfUpdate = currentProfile?.id === user.id;
    
    if (!isAdmin && !isSelfUpdate) {
      console.warn("Unauthorized attempt to sync user data");
      return;
    }

    // Use safe methods to check user existence
    const { data: existingUser, error: checkError } = await supabase
      .rpc('get_safe_public_profiles_by_ids', { _ids: [user.id] });
      
    if (checkError) {
      console.error("Error checking user existence:", checkError);
      return;
    }
    
    // Якщо користувача не існує або результат порожній, створюємо нового
    if (!existingUser || existingUser.length === 0) {
      // Only admins can create/update users based on phone numbers
      if (!isAdmin) {
        console.warn("Non-admin user cannot sync other users' data");
        return;
      }

      // Use RPC function to safely check phone existence (admin only)
      const { data: phoneExists } = await supabase
        .rpc('user_exists_by_phone', { _phone_number: user.phoneNumber || user.phone_number || '' });
        
      if (phoneExists) {
        console.log("User with this phone already exists - skipping direct update for security");
        // Direct user updates should only be done through proper admin functions
        return;
      }
      
      console.warn("Direct user creation bypassed for security - use proper registration flow");
        
      return; // Skip direct user creation
    } else if (existingUser && existingUser.length > 0) {
      // Only allow self-updates or admin updates
      if (!isSelfUpdate && !isAdmin) {
        console.warn("Unauthorized user update attempt");
        return;
      }
      
      // Use safe update methods through RPC or limited fields
      console.log("User exists, skipping direct table update for security");
        
      // Skip shares management for security
    }
  } catch (error) {
    console.error(`Error synchronizing user ${user.id}:`, error);
  }
}

export async function syncAllUsersToSupabase(): Promise<User[]> {
  try {
    // Check if current user is admin before syncing all users
    const { data: isAdmin } = await supabase.rpc('check_admin_access');
    
    if (!isAdmin) {
      console.warn("Non-admin cannot sync all users");
      return [];
    }

    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    if (allUsers && allUsers.length > 0) {
      for (const user of allUsers) {
        await syncUserToSupabase(user);
      }
      
      // Get latest user data from Supabase (admin only)
      const { data: latestUsers, error } = await supabase
        .rpc('get_users_for_admin');
      
      if (!error && latestUsers) {
        console.log("Latest users from Supabase:", latestUsers);
        
        // Update localStorage with latest data (admin only)
        const formattedUsers = latestUsers.map(formatUserFromSupabase);
        localStorage.setItem('users', JSON.stringify(formattedUsers));
        return formattedUsers;
      }
    }
    return [];
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
    bannerUrl: user.banner_url,
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
    viber: user.viber || '',
    title: user.title || ''
  };
}
