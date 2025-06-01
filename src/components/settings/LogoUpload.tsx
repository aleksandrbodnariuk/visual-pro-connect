
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Save, X, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function LogoUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Завантажуємо поточний логотип при завантаженні компонента
  useEffect(() => {
    const loadLogo = async () => {
      // Спочатку перевіряємо localStorage для швидкого відображення
      const storedLogo = localStorage.getItem("customLogo");
      if (storedLogo) {
        setLogoUrl(storedLogo);
      }
      
      // Потім перевіряємо Supabase
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", "site-logo")
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Помилка завантаження логотипу:", error);
          return;
        }
        
        if (data?.value) {
          setLogoUrl(data.value);
          localStorage.setItem("customLogo", data.value);
        }
      } catch (error) {
        console.error("Не вдалося завантажити логотип з бази даних:", error);
      }
    };
    
    loadLogo();
  }, []);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Перевірка типу файлу
    if (!file.type.startsWith('image/')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    // Перевірка розміру файлу (5MB ліміт)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 5MB');
      return;
    }

    // Створюємо превью
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const ensureStorageBucket = async () => {
    try {
      // Перевіряємо, чи існує bucket
      const { data: bucket, error: bucketError } = await supabase.storage.getBucket('logos');
      
      if (bucketError && bucketError.message.includes('does not exist')) {
        // Створюємо bucket, якщо його немає
        console.log('Створюємо bucket для логотипів...');
        const { error: createError } = await supabase.storage.createBucket('logos', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
        
        if (createError) {
          console.error('Помилка створення bucket:', createError);
          throw createError;
        }
        
        console.log('Bucket для логотипів успішно створено');
      } else if (bucketError) {
        console.error('Помилка перевірки bucket:', bucketError);
        throw bucketError;
      }
      
      return true;
    } catch (error) {
      console.error('Помилка роботи з bucket:', error);
      return false;
    }
  };

  const handleUploadLogo = async () => {
    if (!fileInputRef.current?.files?.length) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    setIsUploading(true);
    const file = fileInputRef.current.files[0];

    try {
      // Переконуємося, що bucket існує
      const bucketExists = await ensureStorageBucket();
      if (!bucketExists) {
        throw new Error('Не вдалося підготувати сховище для завантаження');
      }

      // Генеруємо унікальне ім'я файлу з timestamp
      const fileExtension = file.name.split('.').pop() || 'png';
      const uniqueFileName = `site-logo-${Date.now()}.${fileExtension}`;
      
      // Завантажуємо файл
      console.log(`Завантаження логотипу ${uniqueFileName}...`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(uniqueFileName, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });
        
      if (uploadError) {
        console.error("Помилка завантаження файлу:", uploadError);
        throw uploadError;
      }
      
      console.log('Файл успішно завантажено:', uploadData);
      
      // Отримуємо публічний URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(uniqueFileName);
      
      const publicUrl = urlData.publicUrl;
      console.log('Публічний URL логотипу:', publicUrl);
      
      // Зберігаємо в таблицю site_settings
      try {
        const { error: dbError } = await supabase
          .from('site_settings')
          .upsert({ 
            id: 'site-logo', 
            value: publicUrl,
            updated_at: new Date().toISOString()
          });
          
        if (dbError) {
          console.error("Помилка збереження логотипу в базі даних:", dbError);
          throw dbError;
        }
      } catch (dbError) {
        console.error("Помилка з'єднання з базою даних:", dbError);
        throw dbError;
      }

      // Оновлюємо локальний стан і localStorage
      localStorage.setItem("customLogo", publicUrl);
      setLogoUrl(publicUrl);
      setPreviewUrl(null);
      
      // Очищуємо інпут
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Логотип успішно оновлено');
      
      // Відправляємо подію для оновлення інших компонентів
      const logoUpdateEvent = new CustomEvent('logo-updated', { 
        detail: { logoUrl: publicUrl }
      });
      window.dispatchEvent(logoUpdateEvent);
      
    } catch (error) {
      console.error('Помилка при завантаженні логотипу:', error);
      toast.error(`Не вдалося завантажити логотип: ${error.message}`);
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
                    target.style.display = 'none';
                    setLogoUrl(null);
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
