
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Save, X, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createStorageBuckets } from "@/lib/storage";

export function LogoUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure storage buckets exist on component mount
  useEffect(() => {
    createStorageBuckets().catch(console.error);
  }, []);

  // Load the current logo when the component mounts
  useEffect(() => {
    const loadLogo = async () => {
      // Check local storage first
      const storedLogo = localStorage.getItem("customLogo");
      if (storedLogo) {
        setLogoUrl(storedLogo);
        return;
      }
      
      // If not in local storage, try to get from Supabase
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", "site-logo")
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Error loading logo:", error);
          return;
        }
        
        if (data) {
          setLogoUrl(data.value);
          // Also store in localStorage for components that use it
          localStorage.setItem("customLogo", data.value);
        }
      } catch (error) {
        console.error("Failed to load logo from database:", error);
      }
    };
    
    loadLogo();
  }, []);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Будь ласка, виберіть зображення');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 2MB');
      return;
    }

    // Create preview
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
      // Ensure the logos bucket exists
      console.log('Перевіряю наявність бакета logos...');
      try {
        const { data: bucket, error } = await supabase.storage.getBucket('logos');
        
        if (error && !error.message.includes('does not exist')) {
          console.error('Помилка перевірки бакета logos:', error);
        }
        
        if (!bucket) {
          console.log('Створюю бакет logos...');
          const { error: createError } = await supabase.storage.createBucket('logos', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
          });
          
          if (createError) {
            console.error('Помилка створення бакета logos:', createError);
            throw createError;
          } else {
            console.log('Бакет logos успішно створено');
          }
        } else {
          console.log('Бакет logos вже існує');
        }
      } catch (bucketError) {
        console.error('Помилка при перевірці/створенні бакета:', bucketError);
      }

      // Generate a unique filename with timestamp
      const uniqueFileName = `site-logo-${Date.now()}`;
      
      // Upload file to storage
      console.log(`Завантаження логотипу ${uniqueFileName}...`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(uniqueFileName, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });
        
      if (uploadError) {
        console.error('Помилка завантаження логотипу:', uploadError);
        throw uploadError;
      }
      
      console.log('Логотип успішно завантажено:', uploadData);
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(uniqueFileName);
      
      const publicUrl = urlData.publicUrl;
      console.log('Публічний URL логотипу:', publicUrl);
      
      // Save to site_settings table
      try {
        const { error } = await supabase
          .from('site_settings')
          .upsert({ 
            id: 'site-logo', 
            value: publicUrl,
            updated_at: new Date().toISOString()
          });
          
        if (error) {
          console.error("Помилка збереження логотипу в базі даних:", error);
          throw error;
        }
      } catch (dbError) {
        console.error("Помилка з'єднання з базою даних:", dbError);
        throw dbError;
      }

      // Update local storage and state
      localStorage.setItem("customLogo", publicUrl);
      setLogoUrl(publicUrl);
      setPreviewUrl(null);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Логотип успішно оновлено');
    } catch (error) {
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
