
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { uploadToStorage } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';

export function useBannerUpload(
  userId: string,
  existingBannerUrl?: string | null,
  onComplete?: (url: string) => void
) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(existingBannerUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingBannerUrl !== undefined) {
      setBannerUrl(existingBannerUrl);
    }
  }, [existingBannerUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Збільшуємо обмеження розміру файлу до 10MB для банерів
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Розмір файлу не повинен перевищувати 10MB для банера');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    console.log('Вибрано файл банера:', file.name, 'розмір:', file.size, 'байт');

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    fileReader.readAsDataURL(file);
  };

  const handleUpload = async (): Promise<string> => {
    if (!fileInputRef.current?.files?.length) {
      toast.error('Будь ласка, виберіть файл');
      return '';
    }

    const file = fileInputRef.current.files[0];
    setIsUploading(true);
    let uploadedUrl = '';

    try {
      console.log('Завантаження банера для користувача:', userId);
      console.log('Розмір файлу банера:', file.size, 'байт');
      console.log('Тип файлу банера:', file.type);
      
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const uniqueFileName = `${Date.now()}.${fileExtension}`;
      const filePath = `${userId}/${uniqueFileName}`;
      
      console.log('Шлях файлу банера:', filePath);
      
      const publicUrl = await uploadToStorage('banners', filePath, file, file.type);
      uploadedUrl = publicUrl;
      
      console.log('Банер успішно завантажено, URL:', publicUrl);

      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ banner_url: publicUrl })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Помилка оновлення банера в профілі користувача:', updateError);
        } else {
          console.log('Банер успішно оновлено в базі даних');
        }
      } catch (dbError) {
        console.warn('Не вдалося оновити в базі даних:', dbError);
      }

      // Оновлюємо localStorage (обидва формати для сумісності)
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser && currentUser.id === userId) {
        currentUser.banner_url = publicUrl;
        currentUser.bannerUrl = publicUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('Оновлено поточного користувача в localStorage');
      }

      setBannerUrl(publicUrl);
      setPreviewUrl(null);
      if (onComplete) {
        onComplete(publicUrl);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Банер успішно оновлено');
    } catch (error) {
      console.error('Помилка при завантаженні банера:', error);
      toast.error('Не вдалося завантажити банер. Перевірте підключення до інтернету та спробуйте ще раз.');
    } finally {
      setIsUploading(false);
    }

    return uploadedUrl;
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeBanner = async (): Promise<boolean> => {
    setIsUploading(true);
    let success = false;

    try {
      const { error } = await supabase
        .from('users')
        .update({ banner_url: null })
        .eq('id', userId);

      if (error) {
        console.error('Помилка видалення банера:', error);
        throw error;
      }

      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser && currentUser.id === userId) {
        currentUser.banner_url = null;
        currentUser.bannerUrl = null;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

      setBannerUrl(null);
      setPreviewUrl(null);

      toast.success('Банер видалено');
      success = true;
    } catch (error) {
      console.error('Помилка видалення банера:', error);
      toast.error('Не вдалося видалити банер');
      success = false;
    } finally {
      setIsUploading(false);
    }

    return success;
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
