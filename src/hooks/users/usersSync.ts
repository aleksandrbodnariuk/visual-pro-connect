
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';

export async function syncUserToSupabase(user: User): Promise<void> {
  if (!user.id) return;
  
  try {
    // Перевірка чи існує користувач в Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, phone_number')
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
            password: user.password || '',
            bio: user.bio || '',
            website: user.website || '',
            instagram: user.instagram || '',
            facebook: user.facebook || '',
            viber: user.viber || '',
            title: user.title || '',
            banner_url: user.bannerUrl || user.banner_url || ''
          })
          .eq('phone_number', user.phoneNumber || user.phone_number || '');
          
        if (updateError) {
          console.error("Error updating existing user by phone:", updateError);
        }
        
        // Якщо користувач є акціонером, перевіряємо запис в таблиці shares
        if (user.isShareHolder || user.is_shareholder) {
          const { data: sharesData, error: sharesError } = await supabase
            .from('shares')
            .select('*')
            .eq('user_id', phoneCheck[0].id);
            
          if (sharesError) {
            console.error("Error checking shares:", sharesError);
          }
          
          // Якщо запису немає або він порожній, створюємо новий
          if (!sharesData || sharesData.length === 0) {
            const { error: insertSharesError } = await supabase
              .from('shares')
              .insert({
                user_id: phoneCheck[0].id,
                quantity: user.shares || 10
              });
              
            if (insertSharesError) {
              console.error("Error inserting shares:", insertSharesError);
            }
          }
        }
        
        return;
      }
      
      // Створюємо нового користувача, якщо не знайдено за телефоном
      const { data: newUser, error: insertError } = await supabase
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
          password: user.password || '',
          bio: user.bio || '',
          website: user.website || '',
          instagram: user.instagram || '',
          facebook: user.facebook || '',
          viber: user.viber || '',
          title: user.title || '',
          banner_url: user.bannerUrl || user.banner_url || ''
        })
        .select();
        
      if (insertError) {
        console.error("Error inserting user to Supabase:", insertError);
        return;
      }
      
      // Якщо користувач є акціонером, створюємо запис в таблиці shares
      if ((user.isShareHolder || user.is_shareholder) && newUser && newUser.length > 0) {
        const { error: sharesError } = await supabase
          .from('shares')
          .insert({
            user_id: newUser[0].id,
            quantity: user.shares || 10
          });
          
        if (sharesError) {
          console.error("Error inserting shares:", sharesError);
        }
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
          password: user.password || '',
          bio: user.bio || '',
          website: user.website || '',
          instagram: user.instagram || '',
          facebook: user.facebook || '',
          viber: user.viber || '',
          title: user.title || '',
          banner_url: user.bannerUrl || user.banner_url || ''
        })
        .eq('id', user.id);
        
      if (updateError) {
        console.error("Error updating user in Supabase:", updateError);
      }
      
      // Якщо користувач є акціонером, перевіряємо запис в таблиці shares
      if (user.isShareHolder || user.is_shareholder) {
        const { data: sharesData, error: sharesError } = await supabase
          .from('shares')
          .select('*')
          .eq('user_id', user.id);
          
        if (sharesError) {
          console.error("Error checking shares:", sharesError);
        }
        
        // Якщо запису немає або він порожній, створюємо новий
        if (!sharesData || sharesData.length === 0) {
          const { error: insertSharesError } = await supabase
            .from('shares')
            .insert({
              user_id: user.id,
              quantity: user.shares || 10
            });
            
          if (insertSharesError) {
            console.error("Error inserting shares:", insertSharesError);
          }
        } 
        // Інакше оновлюємо існуючий запис
        else if (user.shares) {
          const { error: updateSharesError } = await supabase
            .from('shares')
            .update({
              quantity: user.shares
            })
            .eq('user_id', user.id);
            
          if (updateSharesError) {
            console.error("Error updating shares:", updateSharesError);
          }
        }
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
