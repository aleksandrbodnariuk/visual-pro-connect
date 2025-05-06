
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useBannerUpload(
  userId: string,
  existingBannerUrl: string | null = null,
  onComplete?: (url: string) => void
) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(existingBannerUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Try to load banner from Supabase on mount
  useEffect(() => {
    async function loadBannerFromSupabase() {
      try {
        // First try to get from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('banner_url')
          .eq('id', userId)
          .single();
          
        if (userData?.banner_url) {
          setBannerUrl(userData.banner_url);
          return;
        }
        
        // If no URL in users table, try storage
        const fileName = `banner-${userId}`;
        const { data } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);
            
        if (data?.publicUrl) {
          setBannerUrl(data.publicUrl);
          
          // Update user record with this URL
          await supabase
            .from('users')
            .update({ banner_url: data.publicUrl })
            .eq('id', userId);
        }
      } catch (error) {
        console.error("Error loading banner:", error);
      }
    }
    
    if (!existingBannerUrl) {
      loadBannerFromSupabase();
    }
  }, [userId, existingBannerUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Перевірка типу файлу (лише зображення)
    if (!file.type.match('image.*')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    // Максимальний розмір файлу (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 5MB');
      return;
    }

    // Створюємо URL для превью
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    const file = fileInputRef.current.files[0];
    setIsUploading(true);

    try {
      // Генеруємо унікальне ім'я файлу
      const fileName = `banner-${userId}`;

      // Завантажуємо файл до Supabase Storage
      let publicUrl = '';

      try {
        // Спочатку видаляємо старий файл, якщо він існує
        await supabase.storage
          .from('banners')
          .remove([fileName]);
          
        // Завантажуємо новий файл
        const { data, error } = await supabase.storage
          .from('banners')
          .upload(fileName, file, {
            upsert: true,
            cacheControl: '3600'
          });

        if (error) {
          throw error;
        }
        
        // Отримуємо публічне URL для зображення
        const { data: urlData } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);
          
        publicUrl = urlData.publicUrl;
      } catch (storageError: any) {
        console.error("Storage upload error:", storageError);
        throw storageError;
      }

      // Оновлюємо користувача з новим URL банера
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ banner_url: publicUrl })
          .eq('id', userId);
          
        if (updateError) {
          console.error("Error updating user banner:", updateError);
        }
      } catch (updateError) {
        console.error("Error updating user:", updateError);
      }

      setBannerUrl(publicUrl);
      setPreviewUrl(null);
      
      if (onComplete) {
        onComplete(publicUrl);
      }

      // Оновлюємо локальне сховище з новою URL банера
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      if (currentUser && currentUser.id === userId) {
        currentUser.bannerUrl = publicUrl;
        currentUser.banner_url = publicUrl;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      }

      toast.success('Банер профілю оновлено');
    } catch (error) {
      console.error('Помилка при завантаженні банеру:', error);
      toast.error('Не вдалося завантажити банер');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      if (!bannerUrl) return;
      
      setIsUploading(true);
      
      // Спроба видалення з Supabase
      try {
        const fileName = `banner-${userId}`;
        await supabase.storage
          .from('banners')
          .remove([fileName]);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ banner_url: null })
          .eq('id', userId);

        if (updateError) throw updateError;
      } catch (supabaseError) {
        console.warn("Не вдалося видалити банер в Supabase:", supabaseError);
      }
      
      setBannerUrl(null);
      setPreviewUrl(null);
      toast.success('Банер видалено');
      
      if (onComplete) {
        onComplete('');
      }
      
      // Оновлюємо дані в локальному сховищі
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      if (currentUser && currentUser.id === userId) {
        currentUser.bannerUrl = null;
        currentUser.banner_url = null;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      }
    } catch (error: any) {
      toast.error('Помилка при видаленні банера');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    bannerUrl,
    previewUrl,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleUpload,
    handleCancel,
    handleRemoveAvatar
  };
}
