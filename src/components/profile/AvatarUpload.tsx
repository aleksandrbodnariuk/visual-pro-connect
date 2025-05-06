
import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/auth/useAuthState';

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
}

export function AvatarUpload({ userId, avatarUrl: initialAvatarUrl, onAvatarChange }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useAuthState();
  
  // Try to load avatar from Supabase on mount if not provided
  useEffect(() => {
    if (!initialAvatarUrl) {
      async function loadAvatarFromSupabase() {
        try {
          // First try to get from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('avatar_url')
            .eq('id', userId)
            .single();
            
          if (userData?.avatar_url) {
            setAvatarUrl(userData.avatar_url);
            return;
          }
          
          // If no URL in users table, try storage
          const fileName = `avatar-${userId}`;
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
              
          if (data?.publicUrl) {
            setAvatarUrl(data.publicUrl);
            
            // Update user record with this URL
            await supabase
              .from('users')
              .update({ avatar_url: data.publicUrl })
              .eq('id', userId);
          }
        } catch (error) {
          console.error("Error loading avatar:", error);
        }
      }
      
      loadAvatarFromSupabase();
    }
  }, [userId, initialAvatarUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.match('image.*')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    // Check file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 5MB');
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Generate unique filename
      const fileName = `avatar-${userId}`;
      
      try {
        // First check if avatars bucket exists, create if not
        try {
          const { data: bucketExists } = await supabase.storage.getBucket('avatars');
          if (!bucketExists) {
            await supabase.storage.createBucket('avatars', {
              public: true,
              fileSizeLimit: 5242880 // 5MB
            });
          }
        } catch (bucketError) {
          console.log('Checking or creating bucket:', bucketError);
          // Continue anyway since the bucket might already exist
        }

        // First remove old file if exists
        try {
          await supabase.storage
            .from('avatars')
            .remove([fileName]);
        } catch (removeError) {
          console.log('Removing old file (can be ignored if not exists):', removeError);
        }
          
        // Upload new file
        const { error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            upsert: true,
            cacheControl: '3600'
          });
          
        if (error) throw error;
        
        // Get public URL
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        const publicUrl = data.publicUrl;
        
        // Update user in database
        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);
          
        if (updateError) {
          console.error("Error updating user avatar in database:", updateError);
        }
        
        // Update in state and localStorage
        setAvatarUrl(publicUrl);
        
        // Update avatar in current user data
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && currentUser.id === userId) {
          currentUser.avatarUrl = publicUrl;
          currentUser.avatar_url = publicUrl;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          
          // Update current user in context if available
          if (typeof updateUser === 'function') {
            updateUser({
              ...currentUser,
              avatarUrl: publicUrl,
              avatar_url: publicUrl
            });
          }
        }
        
        if (onAvatarChange) {
          onAvatarChange(publicUrl);
        }
        
        toast.success('Аватар успішно оновлено');
        
        // Force refresh components that show the avatar
        window.dispatchEvent(new CustomEvent('avatar-updated', { 
          detail: { userId, avatarUrl: publicUrl } 
        }));
      } catch (error: any) {
        console.error("Помилка при завантаженні на Supabase:", error);
        throw error;
      }
    } catch (error) {
      console.error('Помилка при завантаженні аватара:', error);
      toast.error('Не вдалося завантажити аватар');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-32 w-32 mx-auto">
        <AvatarImage
          src={avatarUrl || undefined}
          alt="Аватар користувача"
          className="object-cover"
          onError={(e) => {
            // Fallback if image loading fails
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/placeholder.svg';
          }}
        />
        <AvatarFallback className="text-4xl">
          {userId?.substring(0, 2) || "КР"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex gap-2 justify-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          id={`avatar-upload-${userId}`}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Завантаження...' : 'Змінити аватар'}
        </Button>
      </div>
    </div>
  );
}
