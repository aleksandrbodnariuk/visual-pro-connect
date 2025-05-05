
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/hooks/auth/useAuthState";

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  onComplete?: (url: string) => void;
}

export function AvatarUpload({ userId, avatarUrl, onComplete }: AvatarUploadProps) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useAuthState();
  
  // При монтуванні компоненту завантажуємо аватар
  useEffect(() => {
    setAvatar(avatarUrl || null);
  }, [avatarUrl]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Ви повинні вибрати зображення для завантаження.");
      }

      const file = event.target.files[0];
      
      // Перевірка типу файлу
      if (!file.type.match('image.*')) {
        throw new Error("Будь ласка, виберіть файл зображення");
      }
      
      // Перевірка розміру файлу
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Розмір файлу не повинен перевищувати 5MB");
      }
      
      // Генеруємо унікальне ім'я файлу
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}-${Date.now()}.${fileExt}`;

      try {
        // Перевіряємо, чи існує бакет
        const { data: bucketExists } = await supabase.storage.getBucket('avatars');
        
        // Якщо бакет не існує, створюємо його
        if (!bucketExists) {
          await supabase.storage.createBucket('avatars', {
            public: true
          });
        }
        
        // Завантажуємо файл
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }
        
        // Отримуємо публічний URL
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        // Оновлюємо аватар в базі даних
        const { error: updateError } = await supabase
          .from("users")
          .update({ avatar_url: publicUrl })
          .eq("id", userId);

        if (updateError) {
          console.error("Error updating user avatar:", updateError);
          toast.error("Не вдалося оновити аватар у базі даних");
        }

        // Оновлюємо UI та локальні дані
        setAvatar(publicUrl);
        updateUser({ avatarUrl: publicUrl, avatar_url: publicUrl });
        
        if (onComplete) {
          onComplete(publicUrl);
        }

        toast.success("Аватар успішно оновлено!");
        
      } catch (storageError: any) {
        // Якщо помилка при завантаженні до Supabase
        console.error("Storage error:", storageError);
        
        // Спробуємо локально зберегти аватар
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          
          // Зберігаємо локально
          setAvatar(base64Data);
          updateUser({ avatarUrl: base64Data });
          
          if (onComplete) {
            onComplete(base64Data);
          }
          
          toast.success("Аватар оновлено (збережено локально)");
        };
        reader.readAsDataURL(file);
      }
      
    } catch (error: any) {
      console.error("Помилка при завантаженні аватару:", error);
      toast.error(`Помилка: ${error.message || "Не вдалося завантажити аватар"}`);
    } finally {
      setUploading(false);
      // Очищаємо поле вводу файлу для можливості повторного завантаження того ж файлу
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-24 w-24">
        {avatar ? (
          <AvatarImage src={avatar} alt="Avatar" className="object-cover" />
        ) : (
          <AvatarFallback>
            <User className="h-12 w-12 text-muted-foreground" />
          </AvatarFallback>
        )}
      </Avatar>
      <div>
        <input
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
          className="hidden"
          ref={fileInputRef}
        />
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={uploading}
          variant="outline"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Завантаження...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Завантажити аватар
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
