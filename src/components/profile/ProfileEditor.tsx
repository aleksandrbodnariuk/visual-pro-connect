import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserRound, Upload, Trash2 } from "lucide-react";

interface ProfileEditorProps {
  user: any;
  onUpdate: () => void;
}

export function ProfileEditor({ user, onUpdate }: ProfileEditorProps) {
  const [country, setCountry] = useState(user?.country || "");
  const [city, setCity] = useState(user?.city || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setCountry(user.country || "");
      setCity(user.city || "");
      setAvatarUrl(user.avatar_url || null);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("users")
        .update({
          country,
          city,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Профіль оновлено");
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при оновленні профілю");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      setIsUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      if (avatarUrl) {
        try {
          const oldAvatarPath = avatarUrl.split("/").pop();
          if (oldAvatarPath) {
            await supabase.storage
              .from("avatars")
              .remove([`${user.id}/${oldAvatarPath}`]);
          }
        } catch (removeError) {
          console.warn("Не вдалося видалити попередній аватар", removeError);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;
      setAvatarUrl(newAvatarUrl);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Аватар оновлено");
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при завантаженні аватара");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      if (!avatarUrl) return;
      
      setIsUploading(true);
      
      try {
        const oldAvatarPath = avatarUrl.split("/").pop();
        if (oldAvatarPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldAvatarPath}`]);
        }
      } catch (removeError) {
        console.warn("Не вдалося видалити файл аватара", removeError);
      }
      
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;
      
      setAvatarUrl(null);
      toast.success("Аватар видалено");
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при видаленні аватара");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
          <div className="flex flex-col items-center">
            <Avatar className="h-24 w-24 mb-2">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={user?.full_name || 'Користувач'} />
              ) : (
                <AvatarFallback>
                  <UserRound className="h-12 w-12" />
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex gap-2 mt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="relative"
                disabled={isUploading}
              >
                <input 
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                <Upload className="h-4 w-4 mr-1" /> Змінити
              </Button>
              
              {avatarUrl && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Видалити
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div>
              <Label htmlFor="country">Країна</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Введіть країну"
              />
            </div>

            <div>
              <Label htmlFor="city">Місто</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Введіть місто"
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleUpdateProfile} 
          className="w-full"
          disabled={isSaving}
        >
          {isSaving ? "Зберігаю..." : "Зберегти зміни"}
        </Button>
      </div>
    </Card>
  );
}
