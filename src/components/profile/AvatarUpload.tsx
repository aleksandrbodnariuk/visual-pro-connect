
import { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange 
}: { 
  currentAvatarUrl?: string;
  onAvatarChange: (url: string | null) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        toast.error('Ви повинні увійти в систему');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${currentUser.user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        toast.error('Помилка при завантаженні файлу');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onAvatarChange(publicUrl);
      toast.success('Аватар успішно оновлено');
    } catch (error) {
      toast.error('Помилка при завантаженні аватару');
    } finally {
      setIsUploading(false);
    }
  }, [onAvatarChange]);

  const deleteAvatar = async () => {
    try {
      if (!currentAvatarUrl) return;
      
      const fileName = currentAvatarUrl.split('/').pop();
      if (!fileName) return;

      const { error } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      if (error) {
        toast.error('Помилка при видаленні аватару');
        return;
      }

      onAvatarChange(null);
      toast.success('Аватар видалено');
    } catch (error) {
      toast.error('Помилка при видаленні аватару');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={currentAvatarUrl} />
        <AvatarFallback>AВ</AvatarFallback>
      </Avatar>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          disabled={isUploading}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) uploadAvatar(file);
            };
            input.click();
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          {isUploading ? 'Завантаження...' : 'Змінити'}
        </Button>
        
        {currentAvatarUrl && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={deleteAvatar}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Видалити
          </Button>
        )}
      </div>
    </div>
  );
}
