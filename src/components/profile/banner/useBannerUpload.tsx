
import { useState, useRef, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useBannerUpload(
  userId: string,
  existingBannerUrl: string | null,
  onComplete?: (url: string) => void
) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(existingBannerUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Завантажуємо файл до Supabase Storage
      let uploadPath = filePath;
      let publicUrl = '';

      try {
        const { data, error } = await supabase.storage
          .from('banners')
          .upload(filePath, file);

        if (error) {
          throw error;
        }
        
        uploadPath = data.path;
        
        // Отримуємо публічне URL для зображення
        const { data: { publicUrl: url } } = supabase.storage
          .from('banners')
          .getPublicUrl(uploadPath);
          
        publicUrl = url;
      } catch (storageError: any) {
        console.error("Storage upload error:", storageError);
        
        if (storageError.message?.includes("duplicate")) {
          const { data: { publicUrl: url } } = supabase.storage
            .from('banners')
            .getPublicUrl(filePath);
            
          publicUrl = url;
        } else {
          // Якщо не вдалося завантажити до Supabase, зберігаємо локально
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            localStorage.setItem(`banner-${userId}`, dataUrl);
            setBannerUrl(dataUrl);
            setPreviewUrl(null);
            
            if (onComplete) {
              onComplete(dataUrl);
            }
            
            toast.success('Банер оновлено (збережено локально)');
          };
          return;
        }
      }

      // Оновлюємо користувача з новим URL банера
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ banner_url: publicUrl })
          .eq('id', userId);
          
        if (updateError) {
          console.error("Error updating user banner:", updateError);
          // Зберігаємо в localStorage як запасний варіант
          localStorage.setItem(`banner-${userId}`, publicUrl);
        }
      } catch (updateError) {
        console.error("Error updating user:", updateError);
        localStorage.setItem(`banner-${userId}`, publicUrl);
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
        const oldAvatarPath = bannerUrl.split("/").pop();
        if (oldAvatarPath) {
          await supabase.storage
            .from('banners')
            .remove([`${userId}/${oldAvatarPath}`]);
        }
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ banner_url: null })
          .eq('id', userId);

        if (updateError) throw updateError;
      } catch (supabaseError) {
        console.warn("Не вдалося видалити банер в Supabase:", supabaseError);
        
        // Оновлюємо дані в локальному сховищі
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        if (currentUser && currentUser.id === userId) {
          currentUser.bannerUrl = null;
          currentUser.banner_url = null;
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }
      }
      
      setBannerUrl(null);
      setPreviewUrl(null);
      toast.success('Банер видалено');
      
      if (onComplete) {
        onComplete('');
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
