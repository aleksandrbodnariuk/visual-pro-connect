
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Save, X, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function LogoSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem("siteLogoUrl") || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [logoText, setLogoText] = useState<string>(localStorage.getItem("siteLogoText") || "Спільнота B&C");
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

        // Зберігаємо URL логотипу
        localStorage.setItem("siteLogoUrl", publicUrl);
        localStorage.setItem("customLogo", publicUrl); // Також зберігаємо як customLogo для NavbarLogo
        setLogoUrl(publicUrl);
        setPreviewUrl(null);

        toast.success('Логотип оновлено');
      } catch (storageError: any) {
        console.error("Error uploading logo:", storageError);
        
        // Якщо не вдалося завантажити до Supabase, зберігаємо локально
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          localStorage.setItem("siteLogoUrl", dataUrl);
          localStorage.setItem("customLogo", dataUrl); // Також зберігаємо як customLogo для NavbarLogo
          setLogoUrl(dataUrl);
          setPreviewUrl(null);
          
          toast.success('Логотип оновлено (збережено локально)');
        };
      }
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

  const handleSaveLogoText = () => {
    localStorage.setItem("siteLogoText", logoText);
    toast.success('Назву сайту оновлено');
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Налаштування логотипу</CardTitle>
          <CardDescription>Змініть логотип та назву сайту</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Логотип сайту</Label>
            <div className="flex justify-center mb-4">
              <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center">
                {(previewUrl || logoUrl) ? (
                  <img 
                    src={previewUrl || logoUrl || ''} 
                    alt="Логотип сайту" 
                    className="max-h-24 object-contain"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full flex flex-col items-center justify-center text-gray-400 border border-dashed">
                    <Image className="h-8 w-8 mb-2" />
                    <span className="text-xs">Логотип відсутній</span>
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
                <Upload className="mr-2 h-4 w-4" /> Вибрати новий логотип
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

          <div className="space-y-4 pt-4 border-t">
            <Label htmlFor="logo-text">Назва сайту</Label>
            <Input 
              id="logo-text"
              value={logoText}
              onChange={(e) => setLogoText(e.target.value)}
              placeholder="Введіть назву сайту"
            />
            <Button onClick={handleSaveLogoText}>
              <Save className="mr-2 h-4 w-4" /> Зберегти назву
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
