
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadToStorage, deleteFromStorage } from '@/lib/storage';

export function useBannerUpload(userId: string, existingBannerUrl?: string | null, onComplete?: (url: string) => void) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(existingBannerUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Перевірка чи файл - зображення
    if (!file.type.match('image.*')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }
    
    // Перевірка розміру файлу (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 10MB');
      return;
    }
    
    // Відображення превью
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleUpload = async () => {
    if (!previewUrl || !fileInputRef.current?.files?.[0]) {
      toast.error('Спочатку виберіть зображення');
      return null;
    }
    
    const file = fileInputRef.current.files[0];
    setIsUploading(true);
    
    try {
      // Генеруємо унікальне ім'я файлу
      const fileName = `banner-${userId}`;
      const uniqueFileName = `${fileName}-${Date.now()}`;
      
      // Завантажуємо в Supabase Storage
      const publicUrl = await uploadToStorage('banners', uniqueFileName, file);
      
      // Оновлюємо запис користувача з URL банера
      const { error: updateError } = await supabase
        .from('users')
        .update({ banner_url: publicUrl })
        .eq('id', userId);
        
      if (updateError) {
        console.error("Помилка оновлення banner_url в базі даних:", updateError);
        throw updateError;
      }
      
      // Оновлюємо стан
      setBannerUrl(publicUrl);
      setPreviewUrl(null);
      
      // Очищаємо поле вводу
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Банер успішно оновлено');
      
      // Викликаємо onComplete якщо надано
      if (onComplete) {
        onComplete(publicUrl);
      }
      
      return publicUrl;
    } catch (error) {
      console.error('Помилка завантаження банера:', error);
      toast.error('Не вдалося завантажити банер');
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeBanner = async () => {
    setIsUploading(true);
    
    try {
      // Видаляємо із сховища
      if (bannerUrl) {
        try {
          const fileName = `banner-${userId}`;
          await deleteFromStorage('banners', fileName);
        } catch (deleteError) {
          console.warn("Помилка видалення файлу (можна ігнорувати):", deleteError);
        }
      }
      
      // Оновлюємо запис користувача
      const { error } = await supabase
        .from('users')
        .update({ banner_url: null })
        .eq('id', userId);
        
      if (error) {
        console.error("Помилка видалення banner_url в базі даних:", error);
        throw error;
      }
      
      // Оновлюємо стан
      setBannerUrl(null);
      setPreviewUrl(null);
      
      toast.success('Банер видалено');
      return true;
    } catch (error) {
      console.error('Помилка видалення банера:', error);
      toast.error('Не вдалося видалити банер');
      return false;
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
    removeBanner
  };
}
