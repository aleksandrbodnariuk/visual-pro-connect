
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Edit, Image, FileVideo } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: string;
}

interface PortfolioManagerProps {
  userId: string;
  onUpdate: () => void;
}

export function PortfolioManager({ userId, onUpdate }: PortfolioManagerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioItems();
  }, [userId]);

  const fetchPortfolioItems = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPortfolioItems(data || []);
    } catch (error: any) {
      toast.error("Помилка при завантаженні портфоліо");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
      fetchPortfolioItems();
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при завантаженні файлу");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    try {
      // Отримуємо ім'я файлу з URL
      const filePathMatch = item.media_url.match(/\/([^/?#]+)(?:[?#]|$)/);
      const fileName = filePathMatch ? filePathMatch[1] : null;
      
      if (!fileName) {
        toast.error("Не вдалося визначити шлях до файлу");
        return;
      }
      
      // Видаляємо запис з бази даних
      const { error: deleteRecordError } = await supabase
        .from("portfolio")
        .delete()
        .eq("id", item.id);

      if (deleteRecordError) throw deleteRecordError;
      
      // Спроба видалити файл зі сховища
      const filePath = `${userId}/${fileName}`;
      const { error: deleteStorageError } = await supabase.storage
        .from("portfolio")
        .remove([filePath]);

      if (deleteStorageError) {
        console.warn("Не вдалося видалити файл зі сховища:", deleteStorageError);
        // Не перериваємо процес, просто логуємо помилку
      }

      toast.success("Файл успішно видалено");
      fetchPortfolioItems();
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при видаленні файлу");
      console.error(error);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Додати нове медіа</h3>
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
            {isUploading ? "Завантаження..." : "Завантажити"}
          </Button>
        </div>

        {portfolioItems.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Моє портфоліо</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {portfolioItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {item.media_type === "photo" ? (
                      <img 
                        src={item.media_url} 
                        alt={item.title}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FileVideo className="h-12 w-12 text-muted-foreground" />
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Відео
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium truncate">{item.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {item.description || "Без опису"}
                    </p>
                    <div className="mt-4 flex justify-between">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Видалити
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {isLoading && <div className="text-center py-8">Завантаження...</div>}
        
        {!isLoading && portfolioItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>У вас ще немає елементів портфоліо</p>
          </div>
        )}
      </div>
    </Card>
  );
}
