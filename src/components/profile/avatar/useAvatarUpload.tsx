
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

  useEffect(() => {
    if (initialAvatarUrl !== undefined) {
      setAvatarUrl(initialAvatarUrl);
    }
  }, [initialAvatarUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Обмеження розміру файлу до 2MB для аватарів
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Розмір файлу не повинен перевищувати 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    setIsUploading(true);

    try {
      console.log('Завантаження аватара для користувача:', userId);
      
      // Створюємо унікальне ім'я файлу
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const uniqueFileName = `${userId}-${Date.now()}.${fileExtension}`;
      const filePath = `avatars/${uniqueFileName}`;
      
      // Використовуємо uploadToStorage з lib/storage
      const publicUrl = await uploadToStorage('avatars', filePath, file, file.type);
      
      console.log('Аватар успішно завантажено, URL:', publicUrl);

      // Оновлюємо URL аватара в базі даних
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Помилка оновлення аватара користувача:', updateError);
        }
      } catch (dbError) {
        console.warn('Не вдалося оновити в базі даних:', dbError);
      }

      // Оновлюємо localStorage
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
      toast.error('Не вдалося завантажити аватар. Спробуйте зменшити розмір файлу.');
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
