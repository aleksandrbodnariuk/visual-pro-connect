
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Save, X, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";

export function LogoUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Завантажуємо поточний логотип при монтуванні компонента
  useEffect(() => {
    const storedLogo = localStorage.getItem("customLogo");
    if (storedLogo) {
      setLogoUrl(storedLogo);
    }
  }, []);
  
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
      // Генеруємо унікальне ім'я файлу - використовуємо те саме ім'я для спрощення оновлення
      const fileName = `site-logo`;
      const uniqueFileName = `${fileName}-${Date.now()}`;
      
      try {
        // Завантажуємо файл через покращену утиліту
        const publicUrl = await uploadToStorage('logos', uniqueFileName, file);
        
        // Зберігаємо URL логотипу в localStorage та Supabase
        localStorage.setItem("customLogo", publicUrl);
        
        try {
          // Зберігаємо посилання в таблиці site_settings
          const { error } = await supabase
            .from('site_settings')
            .upsert({ 
              id: 'site-logo', 
              value: publicUrl,
              updated_at: new Date().toISOString()
            });
            
          if (error) {
            console.error("Помилка збереження логотипу в Supabase:", error);
          }
        } catch (dbError) {
          console.error("Помилка з'єднання з базою даних:", dbError);
        }
        
        toast.success('Логотип оновлено');
        
        // Оновлюємо відображення
        setLogoUrl(publicUrl);
        setPreviewUrl(null);
        
        // Очищаємо превью і поле вводу
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (storageError: any) {
        console.error("Помилка завантаження логотипу:", storageError);
        toast.error('Помилка при завантаженні логотипу');
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
          <Label>Поточний логотип сайту</Label>
          <div className="flex justify-center mb-4">
            <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Логотип сайту" 
                  className="max-h-24 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                    target.onerror = null;
                  }}
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
            <>
              <div className="flex justify-center mt-4 mb-4">
                <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="Превью логотипу" 
                    className="max-h-24 object-contain"
                  />
                </div>
              </div>
              
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
