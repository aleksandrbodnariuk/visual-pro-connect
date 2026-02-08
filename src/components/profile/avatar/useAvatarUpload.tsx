
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { uploadToStorage } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { compressImageFromDataUrl } from '@/lib/imageCompression';

export function useAvatarUpload(
  userId: string,
  initialAvatarUrl?: string | null,
  onAvatarChange?: (url: string) => void
) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAvatarUrl !== undefined) {
      setAvatarUrl(initialAvatarUrl);
    }
  }, [initialAvatarUrl]);

  const uploadCroppedImage = async (croppedDataUrl: string) => {
    setIsUploading(true);

    try {
      console.log('Стискання та завантаження аватара для користувача:', userId);
      
      // Compress the cropped image
      const compressedDataUrl = await compressImageFromDataUrl(croppedDataUrl, 'avatar');
      console.log('Аватар стиснуто');
      
      // Convert data URL to Blob
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();
      
      // Create file from blob
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      console.log('Розмір файлу:', file.size, 'байт');
      
      // Create unique file name
      const uniqueFileName = `${userId}-${Date.now()}.jpg`;
      const filePath = `avatars/${uniqueFileName}`;
      
      // Upload to storage
      const publicUrl = await uploadToStorage('avatars', filePath, file, 'image/jpeg');
      
      console.log('Аватар успішно завантажено, URL:', publicUrl);

      // Update database
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Помилка оновлення аватара користувача:', updateError);
        } else {
          console.log('Аватар успішно оновлено в базі даних');
        }
      } catch (dbError) {
        console.warn('Не вдалося оновити в базі даних:', dbError);
      }

      // Update localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser && currentUser.id === userId) {
        currentUser.avatar_url = publicUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const updatedUsers = users.map((user: any) => {
        if (user.id === userId) {
          return { ...user, avatar_url: publicUrl };
        }
        return user;
      });
      localStorage.setItem('users', JSON.stringify(updatedUsers));

      setAvatarUrl(publicUrl);
      if (onAvatarChange) {
        onAvatarChange(publicUrl);
      }

      toast.success('Аватар успішно оновлено');
    } catch (error) {
      console.error('Помилка при завантаженні аватара:', error);
      toast.error('Не вдалося завантажити аватар. Перевірте підключення до інтернету та спробуйте ще раз.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Розмір файлу не повинен перевищувати 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    // Read and upload directly (for backward compatibility)
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await uploadCroppedImage(dataUrl);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    avatarUrl,
    isUploading,
    fileInputRef,
    handleFileChange,
    uploadCroppedImage
  };
}
