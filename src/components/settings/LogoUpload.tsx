
import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function LogoUpload() {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    // Спочатку перевіряємо, чи є кастомний логотип в локальному сховищі
    return localStorage.getItem('customLogo') || '/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png';
  });
  
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

    // Максимальний розмір файлу (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 2MB');
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
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Завантажуємо файл до Supabase Storage
      let uploadPath = filePath;
      
      try {
        const { data, error } = await supabase.storage
          .from('logos')
          .upload(filePath, file);

        if (error) {
          throw new Error('Помилка завантаження до Supabase Storage');
        }
        
        uploadPath = data.path;
      } catch (storageError) {
        console.error("Storage upload error:", storageError);
        // Якщо не вдалося завантажити до Supabase, зберігаємо локально
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          localStorage.setItem('customLogo', dataUrl);
          setLogoUrl(dataUrl);
          setPreviewUrl(null);
          toast.success('Логотип оновлено (збережено локально)');
        };
        return;
      }

      // Отримуємо публічне URL для зображення
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(uploadPath);

      // Зберігаємо URL в localStorage
      localStorage.setItem('customLogo', publicUrl);
      setLogoUrl(publicUrl);
      setPreviewUrl(null);

      toast.success('Логотип оновлено');
    } catch (error) {
      console.error('Помилка при завантаженні логотипу:', error);
      toast.error('Не вдалося завантажити логотип');
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
        <CardTitle>Логотип сайту</CardTitle>
        <CardDescription>Завантажте новий логотип для вашого сайту</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center mb-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <img 
              src={previewUrl || logoUrl} 
              alt="Логотип сайту" 
              className="h-24 w-24 object-contain"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo-upload">Виберіть новий логотип</Label>
          <input
            id="logo-upload"
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
              <Upload className="mr-2 h-4 w-4" /> Вибрати файл
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
