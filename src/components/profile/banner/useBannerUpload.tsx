
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { uploadToStorage, deleteOldFile } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { compressImageFromDataUrl, dataUrlToBlob, validateImageSize, OUTPUT_FORMAT, OUTPUT_EXTENSION } from '@/lib/imageCompression';

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
      const blob = dataUrlToBlob(compressedDataUrl);
      
      // Create file from blob (WebP)
      const file = new File([blob], `banner-${Date.now()}${OUTPUT_EXTENSION}`, { type: OUTPUT_FORMAT });
      
      console.log('Розмір файлу банера:', file.size, 'байт');
      
      // Delete old banner from storage before uploading new one
      await deleteOldFile('banners', bannerUrl);
      
      // Store banner inside the user's folder to satisfy storage RLS policies
      const uniqueFileName = `${userId}/${Date.now()}${OUTPUT_EXTENSION}`;
      
      // Upload to storage
      const publicUrl = await uploadToStorage('banners', uniqueFileName, file, OUTPUT_FORMAT);
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

       // Keep local cached profile in sync with the new banner URL
       const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
       if (currentUser && currentUser.id === userId) {
         currentUser.banner_url = publicUrl;
         currentUser.bannerUrl = publicUrl;
         localStorage.setItem('currentUser', JSON.stringify(currentUser));
       } else {
         localStorage.removeItem('currentUser');
       }
      
      // Update URL with timestamp for cache busting
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setBannerUrl(urlWithTimestamp);
      setPreviewUrl(null);
      
      if (onComplete) {
        onComplete(urlWithTimestamp);
      }

      toast.success('Банер успішно оновлено');
      // No full page reload — state already updated above; parent components
      // refetch via onComplete or AuthContext will pick up the change.
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

    // HEIC check
    const HEIC_TYPES = ['image/heic', 'image/heif'];
    if (HEIC_TYPES.includes(file.type) || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      toast.error('Цей формат зображення не підтримується. Будь ласка, використайте JPEG або PNG.');
      return;
    }

    const sizeCheck = validateImageSize(file, 'banner');
    if (!sizeCheck.valid) {
      toast.error(sizeCheck.message);
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
      // Delete banner file from storage
      await deleteOldFile('banners', bannerUrl);

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
