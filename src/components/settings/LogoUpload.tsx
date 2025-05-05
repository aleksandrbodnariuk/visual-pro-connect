
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Save, X, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function LogoUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Перевірка типу файлу
    if (!file.type.match('image.*')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    // Максимальний розмір файлу
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

  const handleUploadLogo = async () => {
    if (!fileInputRef.current?.files?.length) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    setIsUploading(true);
    const file = fileInputRef.current.files[0];

    try {
      // Генеруємо унікальне ім'я файлу
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Завантажуємо файл до Supabase Storage
      try {
        // Перевіряємо, чи існує бакет
        const { data: bucketExists } = await supabase.storage.getBucket('logos');
        
        // Якщо бакет не існує, створюємо його
        if (!bucketExists) {
          await supabase.storage.createBucket('logos', {
            public: true
          });
        }
        
        const { data, error } = await supabase.storage
          .from('logos')
          .upload(fileName, file);

        if (error) {
          throw error;
        }

        // Отримуємо публічне URL для зображення
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(data.path);

        // Зберігаємо URL логотипу в localStorage
        localStorage.setItem("customLogo", publicUrl);
        toast.success('Логотип оновлено');
        
        // Очищаємо превью і поле вводу
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (storageError: any) {
        console.error("Error uploading logo:", storageError);
        
        // Якщо не вдалося завантажити до Supabase, зберігаємо локально
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          localStorage.setItem("customLogo", dataUrl);
          setPreviewUrl(null);
          
          toast.success('Логотип оновлено (збережено локально)');
          
          // Очищаємо поле вводу
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        };
      }
    } catch (error) {
      console.error('Помилка при завантаженні логотипу:', error);
      toast.error('Не вдалося завантажити логотип');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Завантаження логотипу</CardTitle>
        <CardDescription>Змініть логотип сайту</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Логотип сайту</Label>
          <div className="flex justify-center mb-4">
            <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Превью логотипу" 
                  className="max-h-24 object-contain"
                />
              ) : (
                <div className="h-24 w-24 rounded-full flex flex-col items-center justify-center text-gray-400 border border-dashed">
                  <Image className="h-8 w-8 mb-2" />
                  <span className="text-xs">Логотип для завантаження</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <input
              id="logo-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" /> Вибрати логотип
            </Button>
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
                onClick={handleUploadLogo}
                disabled={isUploading}
              >
                <Save className="mr-2 h-4 w-4" /> {isUploading ? 'Завантаження...' : 'Зберегти логотип'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
