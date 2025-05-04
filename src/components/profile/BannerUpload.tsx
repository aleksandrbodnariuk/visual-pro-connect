import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BannerUploadProps {
  userId: string;
  existingBannerUrl?: string | null;
  onComplete?: (url: string) => void;
}

export function BannerUpload({ userId, existingBannerUrl, onComplete }: BannerUploadProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Банер профілю</CardTitle>
        <CardDescription>Завантажте новий банер для вашого профілю</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center mb-4">
          <div className="p-2 border rounded-lg bg-muted/50 w-full">
            {(previewUrl || bannerUrl) ? (
              <img 
                src={previewUrl || bannerUrl || ''} 
                alt="Банер профілю" 
                className="w-full h-32 object-cover rounded"
              />
            ) : (
              <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                Банер не встановлено
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner-upload">Виберіть новий банер</Label>
          <input
            id="banner-upload"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" /> Вибрати зображення
            </Button>
          </div>
        </div>

        {previewUrl && (
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
            >
              <X className="mr-2 h-4 w-4" /> Скасувати
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
            >
              <Save className="mr-2 h-4 w-4" /> {isUploading ? 'Завантаження...' : 'Зберегти'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
