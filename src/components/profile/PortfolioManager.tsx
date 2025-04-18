
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

interface PortfolioManagerProps {
  userId: string;
  onUpdate: () => void;
}

export function PortfolioManager({ userId, onUpdate }: PortfolioManagerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      toast.error("Будь ласка, заповніть всі обов'язкові поля");
      return;
    }

    try {
      setIsUploading(true);

      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      const mediaType = file.type.startsWith("image/") ? "photo" : "video";

      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("portfolio")
        .insert({
          user_id: userId,
          title,
          description,
          media_url: urlData.publicUrl,
          media_type: mediaType
        });

      if (insertError) throw insertError;

      toast.success("Файл успішно завантажено");
      setTitle("");
      setDescription("");
      setFile(null);
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при завантаженні файлу");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (mediaUrl: string) => {
    try {
      const fileName = mediaUrl.split("/").pop();
      if (!fileName) return;

      const { error: deleteStorageError } = await supabase.storage
        .from("portfolio")
        .remove([fileName]);

      if (deleteStorageError) throw deleteStorageError;

      const { error: deleteRecordError } = await supabase
        .from("portfolio")
        .delete()
        .eq("media_url", mediaUrl);

      if (deleteRecordError) throw deleteRecordError;

      toast.success("Файл успішно видалено");
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при видаленні файлу");
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Назва</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Введіть назву"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Опис</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Введіть опис"
          />
        </div>

        <div>
          <Label htmlFor="file">Файл</Label>
          <Input
            id="file"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        <Button onClick={handleUpload} disabled={isUploading} className="w-full">
          Завантажити
        </Button>
      </div>
    </Card>
  );
}
