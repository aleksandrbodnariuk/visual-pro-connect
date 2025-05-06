
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadToStorage } from '@/lib/storage';
import { useAuthState } from '@/hooks/auth/useAuthState';

export function useAvatarUpload(
  userId: string,
  initialAvatarUrl?: string | null,
  onAvatarChange?: (url: string) => void
) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useAuthState();

  // Завантаження аватару при монтуванні компонента
  useEffect(() => {
    if (!initialAvatarUrl) {
      loadAvatarFromSupabase();
    }
  }, [initialAvatarUrl, userId]);

  const loadAvatarFromSupabase = async () => {
    try {
      // Спочатку отримуємо з бази даних
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .single();
        
      if (userData?.avatar_url) {
        setAvatarUrl(userData.avatar_url);
        return;
      }
      
      // Якщо URL відсутній у базі, перевіряємо сховище
      const fileName = `avatar-${userId}`;
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
          
      if (data?.publicUrl) {
        setAvatarUrl(data.publicUrl);
        
        // Оновлюємо запис користувача
        await supabase
          .from('users')
          .update({ avatar_url: data.publicUrl })
          .eq('id', userId);
      }
    } catch (error) {
      console.error("Помилка завантаження аватара:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Перевірка типу файлу
    if (!file.type.match('image.*')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    // Перевірка розміру файлу
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 5MB');
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Генеруємо унікальне ім'я файлу
      const fileName = `avatar-${userId}`;
      const uniqueFileName = `${fileName}-${Date.now()}`;
      
      // Завантажуємо через оновлену утиліту
      const publicUrl = await uploadToStorage('avatars', uniqueFileName, file);
      
      // Оновлюємо запис в базі
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
        
      if (updateError) {
        console.error("Помилка оновлення аватару в базі даних:", updateError);
      }
      
      // Оновлюємо стан
      setAvatarUrl(publicUrl);
      
      // Оновлюємо дані поточного користувача
      updateUserAvatar(publicUrl);
      
      // Сповіщаємо користувача
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

  const updateUserAvatar = (url: string) => {
    // Оновлюємо локальні дані
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.id === userId) {
      currentUser.avatarUrl = url;
      currentUser.avatar_url = url;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // Оновлюємо контекст користувача
      if (typeof updateUser === 'function') {
        updateUser({
          ...currentUser,
          avatarUrl: url,
          avatar_url: url
        });
      }
    }
    
    // Викликаємо колбек
    if (onAvatarChange) {
      onAvatarChange(url);
    }
    
    // Сповіщаємо інші компоненти
    window.dispatchEvent(new CustomEvent('avatar-updated', { 
      detail: { userId, avatarUrl: url } 
    }));
  };

  return {
    avatarUrl,
    isUploading,
    fileInputRef,
    handleFileChange
  };
}
