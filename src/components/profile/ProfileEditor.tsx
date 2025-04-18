
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProfileEditorProps {
  user: any;
  onUpdate: () => void;
}

export function ProfileEditor({ user, onUpdate }: ProfileEditorProps) {
  const [country, setCountry] = useState(user.country || "");
  const [city, setCity] = useState(user.city || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateProfile = async () => {
    try {
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

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Аватар оновлено");
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при завантаженні аватара");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="avatar">Аватар</Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={isUploading}
          />
        </div>

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

        <Button onClick={handleUpdateProfile} className="w-full">
          Зберегти зміни
        </Button>
      </div>
    </Card>
  );
}
