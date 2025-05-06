
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

  // Update state if bannerUrl prop changes
  useEffect(() => {
    if (existingBannerUrl !== undefined) {
      setBannerUrl(existingBannerUrl);
    }
  }, [existingBannerUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    // Create a preview URL
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    fileReader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) {
      toast.error('Будь ласка, виберіть файл');
      return;
    }

    const file = fileInputRef.current.files[0];
    setIsUploading(true);

    try {
      console.log('Перевіряю наявність бакета banners...');
      
      // Ensure banner bucket exists
      try {
        const { data: bucket, error } = await supabase.storage.getBucket('banners');
        
        if (error && !error.message.includes('does not exist')) {
          console.error('Помилка перевірки бакета banners:', error);
        }
        
        if (!bucket) {
          console.log('Створюю бакет banners...');
          const { error: createError } = await supabase.storage.createBucket('banners', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
          });
          
          if (createError) {
            console.error('Помилка створення бакета banners:', createError);
            throw createError;
          } else {
            console.log('Бакет banners успішно створено');
          }
        } else {
          console.log('Бакет banners вже існує');
        }
      } catch (bucketError) {
        console.error('Помилка при перевірці/створенні бакета:', bucketError);
      }

      // Create a unique filename
      const uniqueFileName = `${userId}-${Date.now()}`;
      const filePath = `banners/${uniqueFileName}`;
      
      console.log(`Завантаження банера для користувача ${userId}...`);
      
      // Upload using the improved storage utility
      const publicUrl = await uploadToStorage('banners', filePath, file, file.type);
      
      console.log('Банер успішно завантажено, URL:', publicUrl);

      // Update the banner URL in the database
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ banner_url: publicUrl })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Помилка оновлення банера в профілі користувача:', updateError);
          throw updateError;
        }
      } catch (dbError) {
        console.error('Помилка з\'єднання з базою даних:', dbError);
      }

      // Update the banner URL in localStorage for the current user
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser && currentUser.id === userId) {
        currentUser.banner_url = publicUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

      // Update state and callback
      setBannerUrl(publicUrl);
      setPreviewUrl(null);
      if (onComplete) {
        onComplete(publicUrl);
      }

      // Clear the file input and reset preview
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Банер успішно оновлено');
    } catch (error) {
      console.error('Помилка при завантаженні банера:', error);
      toast.error('Не вдалося завантажити банер');
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
      // Remove the banner URL from the database
      const { error } = await supabase
        .from('users')
        .update({ banner_url: null })
        .eq('id', userId);

      if (error) {
        console.error('Помилка видалення банера:', error);
        throw error;
      }

      // Update the banner URL in localStorage for the current user
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser && currentUser.id === userId) {
        currentUser.banner_url = null;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

      // Update state
      setBannerUrl(null);
      setPreviewUrl(null);

      toast.success('Банер видалено');
    } catch (error) {
      console.error('Помилка видалення банера:', error);
      toast.error('Не вдалося видалити банер');
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
