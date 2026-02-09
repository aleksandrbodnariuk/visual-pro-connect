
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { uploadToStorage } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { compressImageFromDataUrl } from '@/lib/imageCompression';

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

  const uploadCroppedImage = async (croppedDataUrl: string) => {
    setIsUploading(true);
    let uploadedUrl = '';

    try {
      console.log('Стискання та завантаження банера для користувача:', userId);
      
      // Compress the cropped image
      const compressedDataUrl = await compressImageFromDataUrl(croppedDataUrl, 'banner');
      console.log('Банер стиснуто');
      
      // Convert data URL to Blob
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();
      
      // Create file from blob
      const file = new File([blob], `banner-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      console.log('Розмір файлу банера:', file.size, 'байт');
      
      // Create unique file name - path inside the bucket
      const uniqueFileName = `${userId}-${Date.now()}.jpg`;
      
      // Upload to storage - use only filename, bucket handles the folder
      const publicUrl = await uploadToStorage('banners', uniqueFileName, file, 'image/jpeg');
      uploadedUrl = publicUrl;
      
      console.log('Банер успішно завантажено, URL:', publicUrl);

      // Update database
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

      // Clear old cache
      localStorage.removeItem('currentUser');
      
      // Update URL with timestamp for cache busting
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setBannerUrl(urlWithTimestamp);
      setPreviewUrl(null);
      
      if (onComplete) {
        onComplete(urlWithTimestamp);
      }

      toast.success('Банер успішно оновлено');
      
      // Force page reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Помилка при завантаженні банера:', error);
      toast.error('Не вдалося завантажити банер. Перевірте підключення до інтернету та спробуйте ще раз.');
    } finally {
      setIsUploading(false);
    }

    return uploadedUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    if (!previewUrl) {
      toast.error('Будь ласка, виберіть файл');
      return '';
    }

    return await uploadCroppedImage(previewUrl);
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
    removeBanner,
    uploadCroppedImage
  };
}
