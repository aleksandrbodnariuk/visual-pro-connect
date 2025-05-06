
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadToStorage, deleteFromStorage } from '@/lib/storage';

export function useBannerUpload(userId: string, existingBannerUrl?: string | null) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(existingBannerUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleUpload = async (file: File) => {
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }
    
    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 10MB');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Generate unique filename
      const fileName = `banner-${userId}`;
      
      // Upload to Supabase Storage
      const publicUrl = await uploadToStorage('banners', fileName, file);
      
      // Update user record with banner URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ banner_url: publicUrl })
        .eq('id', userId);
        
      if (updateError) {
        console.error("Error updating banner_url in database:", updateError);
        throw updateError;
      }
      
      // Update state
      setBannerUrl(publicUrl);
      
      toast.success('Банер успішно оновлено');
      
      // Return the URL for parent components
      return publicUrl;
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Не вдалося завантажити банер');
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  const removeBanner = async () => {
    setIsUploading(true);
    
    try {
      // Delete from storage
      if (bannerUrl) {
        const fileName = `banner-${userId}`;
        await deleteFromStorage('banners', fileName);
      }
      
      // Update user record
      const { error } = await supabase
        .from('users')
        .update({ banner_url: null })
        .eq('id', userId);
        
      if (error) {
        console.error("Error removing banner_url in database:", error);
        throw error;
      }
      
      // Update state
      setBannerUrl(null);
      
      toast.success('Банер видалено');
      return true;
    } catch (error) {
      console.error('Error removing banner:', error);
      toast.error('Не вдалося видалити банер');
      return false;
    } finally {
      setIsUploading(false);
    }
  };
  
  return {
    bannerUrl,
    isUploading,
    handleUpload,
    removeBanner
  };
}
