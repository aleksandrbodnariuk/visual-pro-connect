
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadToStorage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { LogoDisplay } from "@/components/settings/logo/LogoDisplay";
import { LogoPreview } from "@/components/settings/logo/LogoPreview";

export function LogoUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadLogo = async () => {
      const storedLogo = localStorage.getItem("customLogo");
      if (storedLogo) {
        setLogoUrl(storedLogo);
      }
      
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

    if (!file.type.startsWith('image/')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Розмір файлу не повинен перевищувати 50MB для логотипу');
      return;
    }

    console.log('Вибрано файл логотипу:', file.name, 'розмір:', file.size, 'байт');

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
      const fileExtension = file.name.split('.').pop() || 'png';
      const uniqueFileName = `site-logo-${Date.now()}.${fileExtension}`;
      const filePath = `logos/${uniqueFileName}`;
      
      console.log(`Завантаження логотипу ${uniqueFileName}...`);
      console.log('Розмір файлу логотипу:', file.size, 'байт');
      console.log('Тип файлу логотипу:', file.type);
      console.log('Шлях файлу логотипу:', filePath);
      
      const publicUrl = await uploadToStorage('logos', filePath, file, file.type);
      
      console.log('Публічний URL логотипу:', publicUrl);
      
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
        } else {
          console.log('Логотип успішно збережено в базі даних');
        }
      } catch (dbError) {
        console.warn("Не вдалося зберегти в базі даних:", dbError);
      }

      localStorage.setItem("customLogo", publicUrl);
      setLogoUrl(publicUrl);
      setPreviewUrl(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Логотип успішно оновлено');
      
      const logoUpdateEvent = new CustomEvent('logo-updated', { 
        detail: { logoUrl: publicUrl }
      });
      window.dispatchEvent(logoUpdateEvent);
      
    } catch (error: any) {
      console.error('Помилка при завантаженні логотипу:', error);
      toast.error('Не вдалося завантажити логотип. Спробуйте ще раз.');
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
        <CardDescription>Змініть логотип сайту (рекомендований розмір: до 50MB, формат: PNG/JPG)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Поточний логотип сайту</Label>
          <LogoDisplay logoUrl={logoUrl} />

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
              <Upload className="mr-2 h-4 w-4" /> Вибрати логотип (до 50MB)
            </Button>
          </div>

          <LogoPreview 
            previewUrl={previewUrl}
            isUploading={isUploading}
            onSave={handleUploadLogo}
            onCancel={handleCancel}
          />
        </div>
      </CardContent>
    </Card>
  );
}
