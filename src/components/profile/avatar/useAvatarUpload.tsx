
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { uploadToStorage } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';

export function useAvatarUpload(
  userId: string,
  initialAvatarUrl?: string | null,
  onAvatarChange?: (url: string) => void
) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // This effect ensures we update the URL if it changes externally
  useEffect(() => {
    if (initialAvatarUrl !== undefined) {
      setAvatarUrl(initialAvatarUrl);
    }
  }, [initialAvatarUrl]);

  // Handle file upload for avatar
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File validation
    if (!file.type.startsWith('image/')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 5MB');
      return;
    }

    setIsUploading(true);

    try {
      console.log('Створюємо бакет avatars якщо він не існує...');
      
      // Ensure avatar bucket exists
      try {
        const { data: bucket, error } = await supabase.storage.getBucket('avatars');
        
        if (error && !error.message.includes('does not exist')) {
          console.error('Помилка перевірки бакета avatars:', error);
        }
        
        if (!bucket) {
          const { error: createError } = await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
          });
          
          if (createError) {
            console.error('Помилка створення бакета avatars:', createError);
            throw createError;
          } else {
            console.log('Бакет avatars успішно створено');
          }
        } else {
          console.log('Бакет avatars вже існує');
        }
      } catch (bucketError) {
        console.error('Помилка при перевірці/створенні бакета:', bucketError);
      }

      // Use timestamp to ensure unique file name
      const uniqueFileName = `${userId}-${Date.now()}`;
      const filePath = `avatars/${uniqueFileName}`;
      
      console.log(`Завантаження аватара для користувача ${userId}...`);
      
      // Upload the file
      const publicUrl = await uploadToStorage('avatars', filePath, file, file.type);
      
      console.log('Аватар успішно завантажено, URL:', publicUrl);

      // Update the avatar URL in the database
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Помилка оновлення аватара користувача:', updateError);
          throw updateError;
        }
      } catch (dbError) {
        console.error('Помилка з\'єднання з базою даних:', dbError);
      }

      // Update the avatar URL in localStorage for the current user
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser && currentUser.id === userId) {
        currentUser.avatar_url = publicUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

      // Update state and callback
      setAvatarUrl(publicUrl);
      if (onAvatarChange) {
        onAvatarChange(publicUrl);
      }

      toast.success('Аватар успішно оновлено');
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

  return {
    avatarUrl,
    isUploading,
    fileInputRef,
    handleFileChange
  };
}
