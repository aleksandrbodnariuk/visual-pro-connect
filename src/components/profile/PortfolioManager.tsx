
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Edit, Image, FileVideo, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    fetchPortfolioItems();
  }, [userId]);

  const fetchPortfolioItems = async () => {
    try {
      setIsLoading(true);
      
      // Спроба отримати дані з Supabase
      try {
        const { data, error } = await supabase
          .from("portfolio")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setPortfolioItems(data);
          return;
        }
      } catch (supabaseError) {
        console.warn("Не вдалося отримати дані з Supabase:", supabaseError);
      }
      
      // Якщо дані не отримано з Supabase, використовуємо локальне сховище
      const localData = JSON.parse(localStorage.getItem(`portfolio_${userId}`) || "[]");
      setPortfolioItems(localData);
      
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

  const handleEditFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setEditFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      toast.error("Будь ласка, заповніть всі обов'язкові поля");
      return;
    }

    try {
      setIsUploading(true);
      const mediaType = file.type.startsWith("image/") ? "photo" : "video";
      let mediaUrl = "";
      
      // Спроба завантаження в Supabase
      try {
        const fileExt = file.name.split(".").pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("portfolio")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("portfolio")
          .getPublicUrl(filePath);

        mediaUrl = urlData.publicUrl;
        
        const { error: insertError } = await supabase
          .from("portfolio")
          .insert({
            user_id: userId,
            title,
            description,
            media_url: mediaUrl,
            media_type: mediaType
          });

        if (insertError) throw insertError;
      } catch (supabaseError) {
        console.warn("Не вдалося завантажити в Supabase:", supabaseError);
        
        // Альтернативне рішення - зберігаємо в локальному сховищі
        // У реальному додатку тут можна використовувати Firebase або інше сховище
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          mediaUrl = base64Data;
          
          const newItem = {
            id: `local_${Date.now()}`,
            title,
            description,
            media_url: mediaUrl,
            media_type: mediaType
          };
          
          const existingItems = JSON.parse(localStorage.getItem(`portfolio_${userId}`) || "[]");
          const updatedItems = [newItem, ...existingItems];
          localStorage.setItem(`portfolio_${userId}`, JSON.stringify(updatedItems));
          
          setPortfolioItems(updatedItems);
        };
        reader.readAsDataURL(file);
      }

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

  const handleOpenEditDialog = (item: PortfolioItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editItem || !editTitle) {
      toast.error("Будь ласка, заповніть всі обов'язкові поля");
      return;
    }

    try {
      setIsUploading(true);
      let updatedMediaUrl = editItem.media_url;
      let updatedMediaType = editItem.media_type;
      
      // Якщо вибрано новий файл, завантажуємо його
      if (editFile) {
        updatedMediaType = editFile.type.startsWith("image/") ? "photo" : "video";
        
        // Спроба завантаження в Supabase
        try {
          // Спочатку видаляємо старий файл
          const oldFilePathMatch = editItem.media_url.match(/\/([^/?#]+)(?:[?#]|$)/);
          if (oldFilePathMatch && oldFilePathMatch[1]) {
            try {
              await supabase.storage
                .from("portfolio")
                .remove([`${userId}/${oldFilePathMatch[1]}`]);
            } catch (error) {
              console.warn("Не вдалося видалити старий файл:", error);
            }
          }
          
          // Завантажуємо новий файл
          const fileExt = editFile.name.split(".").pop();
          const filePath = `${userId}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("portfolio")
            .upload(filePath, editFile);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("portfolio")
            .getPublicUrl(filePath);

          updatedMediaUrl = urlData.publicUrl;
        } catch (supabaseError) {
          console.warn("Не вдалося завантажити в Supabase:", supabaseError);
          
          // Альтернативне рішення для локального сховища
          const reader = new FileReader();
          reader.onloadend = () => {
            updatedMediaUrl = reader.result as string;
            
            // Оновлюємо дані в локальному сховищі
            const existingItems = JSON.parse(localStorage.getItem(`portfolio_${userId}`) || "[]");
            const updatedItems = existingItems.map((item: PortfolioItem) => {
              if (item.id === editItem.id) {
                return {
                  ...item,
                  title: editTitle,
                  description: editDescription,
                  media_url: updatedMediaUrl,
                  media_type: updatedMediaType
                };
              }
              return item;
            });
            
            localStorage.setItem(`portfolio_${userId}`, JSON.stringify(updatedItems));
            setPortfolioItems(updatedItems);
          };
          reader.readAsDataURL(editFile);
        }
      }
      
      // Оновлюємо запис в базі даних
      try {
        const { error: updateError } = await supabase
          .from("portfolio")
          .update({
            title: editTitle,
            description: editDescription,
            media_url: updatedMediaUrl,
            media_type: updatedMediaType
          })
          .eq("id", editItem.id);

        if (updateError) throw updateError;
      } catch (updateError) {
        console.warn("Не вдалося оновити запис в Supabase:", updateError);
        
        // Оновлюємо дані в локальному сховищі
        const existingItems = JSON.parse(localStorage.getItem(`portfolio_${userId}`) || "[]");
        const updatedItems = existingItems.map((item: PortfolioItem) => {
          if (item.id === editItem.id) {
            return {
              ...item,
              title: editTitle,
              description: editDescription,
              media_url: updatedMediaUrl,
              media_type: updatedMediaType
            };
          }
          return item;
        });
        
        localStorage.setItem(`portfolio_${userId}`, JSON.stringify(updatedItems));
        setPortfolioItems(updatedItems);
      }

      toast.success("Файл успішно оновлено");
      setEditItem(null);
      setEditTitle("");
      setEditDescription("");
      setEditFile(null);
      setEditDialogOpen(false);
      fetchPortfolioItems();
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при оновленні файлу");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDeleteDialog = (item: PortfolioItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      // Спроба видалення з Supabase
      try {
        // Видаляємо запис з бази даних
        const { error: deleteRecordError } = await supabase
          .from("portfolio")
          .delete()
          .eq("id", selectedItem.id);

        if (deleteRecordError) throw deleteRecordError;
        
        // Спроба видалити файл зі сховища
        const filePathMatch = selectedItem.media_url.match(/\/([^/?#]+)(?:[?#]|$)/);
        if (filePathMatch && filePathMatch[1]) {
          const filePath = `${userId}/${filePathMatch[1]}`;
          await supabase.storage
            .from("portfolio")
            .remove([filePath]);
        }
      } catch (supabaseError) {
        console.warn("Не вдалося видалити з Supabase:", supabaseError);
        
        // Видаляємо з локального сховища
        const existingItems = JSON.parse(localStorage.getItem(`portfolio_${userId}`) || "[]");
        const updatedItems = existingItems.filter((item: PortfolioItem) => item.id !== selectedItem.id);
        localStorage.setItem(`portfolio_${userId}`, JSON.stringify(updatedItems));
        setPortfolioItems(updatedItems);
      }

      toast.success("Файл успішно видалено");
      fetchPortfolioItems();
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при видаленні файлу");
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedItem(null);
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
                    <div className="mt-4 flex justify-between gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleOpenDeleteDialog(item)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Видалити
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenEditDialog(item)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Редагувати
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
        
        {/* Діалог редагування */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редагувати медіа</DialogTitle>
              <DialogDescription>
                Змініть інформацію про медіа або завантажте новий файл.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="editTitle">Назва</Label>
                <Input
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Введіть назву"
                  required
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Опис</Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Введіть опис"
                />
              </div>
              <div>
                <Label htmlFor="editFile">Замінити файл (необов'язково)</Label>
                <Input
                  id="editFile"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleEditFileChange}
                  disabled={isUploading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Скасувати
              </Button>
              <Button onClick={handleEdit} disabled={isUploading}>
                {isUploading ? "Зберігаю..." : "Зберегти зміни"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Діалог видалення */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Підтвердження видалення</DialogTitle>
              <DialogDescription>
                Ви впевнені, що хочете видалити "{selectedItem?.title}"? Ця дія незворотна.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Скасувати
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Видалити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
