
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
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}-${Math.random()}.${fileExt}`;

      let uploadResult;
      try {
        uploadResult = await supabase.storage
          .from("avatars")
          .upload(filePath, file);

        if (uploadResult.error) {
          throw uploadResult.error;
        }
      } catch (uploadError: any) {
        console.error("Error uploading avatar:", uploadError);
        
        // Якщо помилка через дублікат, продовжуємо з існуючим шляхом
        if (uploadError.message?.includes("duplicate")) {
          // noop, продовжуємо з поточним filePath
        } else {
          throw uploadError;
        }
      }

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

      setAvatar(publicUrl);
      
      // Оновлюємо локального користувача
      updateUser({ avatarUrl: publicUrl });
      
      if (onComplete) {
        onComplete(publicUrl);
      }

      toast.success("Аватар успішно оновлено!");
      
    } catch (error: any) {
      console.error("Помилка при завантаженні аватару:", error);
      toast.error(`Помилка завантаження аватару: ${error.message}`);
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
