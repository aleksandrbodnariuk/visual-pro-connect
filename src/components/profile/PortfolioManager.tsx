import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Edit, Image, FileVideo, Upload, Link, Music } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadToStorage } from "@/lib/storage";
import {
  compressImageFromDataUrl,
  dataUrlToBlob,
  OUTPUT_FORMAT,
  OUTPUT_EXTENSION,
} from "@/lib/imageCompression";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: string;
}

interface PortfolioManagerProps {
  userId: string;
  onUpdate: () => void;
}

const PAGE_SIZE = 12;
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10MB pre-compression limit
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // 5MB hard cap after compression

// Функція парсингу YouTube/Vimeo посилань
const parseVideoUrl = (url: string) => {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (youtubeMatch) {
    return {
      type: 'youtube',
      id: youtubeMatch[1],
      thumbnail: `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`
    };
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      id: vimeoMatch[1],
      thumbnail: '',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }
  
  return null;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("Не вдалося прочитати файл"));
    reader.readAsDataURL(file);
  });

const getMediaTypeFromFile = (file: File) => {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "photo";
};

const getStorageBucketForMediaType = (mediaType: string) =>
  mediaType === "audio" ? "posts" : "portfolio";

const getStorageLocationFromUrl = (url: string) => {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;

  return {
    bucket: match[1],
    path: decodeURIComponent(match[2].split(/[?#]/)[0]),
  };
};

/**
 * Prepare an image file for upload: compress to WebP via canvas, validate
 * size limits. Returns the resulting File (always WebP for images).
 * Throws with a user-friendly message if file exceeds caps.
 */
async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size > MAX_INPUT_BYTES) {
    // Per spec: still try to compress (don't reject upfront unless image fails)
    if (!file.type.startsWith('image/')) {
      throw new Error('Файл занадто великий (понад 10MB).');
    }
  }
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }
  const dataUrl = await readFileAsDataUrl(file);
  const compressedDataUrl = await compressImageFromDataUrl(dataUrl, 'post');
  const blob = dataUrlToBlob(compressedDataUrl);
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new Error(
      `Зображення завелике навіть після стиснення (${(blob.size / 1024 / 1024).toFixed(1)}MB). Максимум 5MB.`
    );
  }
  const newName = file.name.replace(/\.[^/.]+$/, OUTPUT_EXTENSION);
  return new File([blob], newName, { type: OUTPUT_FORMAT, lastModified: Date.now() });
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
  const [uploadType, setUploadType] = useState<"file" | "link">("file");
  const [videoLink, setVideoLink] = useState("");

  useEffect(() => {
    fetchPortfolioItems();
  }, [userId]);

  const fetchPortfolioItems = async () => {
    try {
      setIsLoading(true);
      const localData = getLocalPortfolioItems(userId);

      try {
        const { data, error } = await supabase
          .from("portfolio")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const remoteData = data || [];
        const mergedItems = [
          ...localData.filter((localItem) => !remoteData.some((remoteItem) => remoteItem.id === localItem.id)),
          ...remoteData,
        ];

        setPortfolioItems(mergedItems);
      } catch (supabaseError) {
        console.warn("Не вдалося отримати дані з Supabase:", supabaseError);
        setPortfolioItems(localData);
      }
      
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
    // Перевірка для посилання
    if (uploadType === "link") {
      if (!videoLink || !title) {
        toast.error("Будь ласка, заповніть назву та посилання");
        return;
      }
      
      const videoData = parseVideoUrl(videoLink);
      if (!videoData) {
        toast.error("Невірний формат посилання. Підтримуються YouTube та Vimeo");
        return;
      }
      
      try {
        setIsUploading(true);
        
        // Спроба збереження в Supabase — зберігаємо оригінальне посилання
        try {
          const { error: insertError } = await supabase
            .from("portfolio")
            .insert({
              user_id: userId,
              title,
              description,
              media_url: videoLink,
              media_type: "video"
            });

          if (insertError) throw insertError;
        } catch (supabaseError) {
          console.warn("Не вдалося зберегти в Supabase:", supabaseError);
          
          // Зберігаємо в локальному сховищі
          const newItem = {
            id: `local_${Date.now()}`,
            title,
            description,
            media_url: videoLink,
            media_type: "video"
          };
          
          const existingItems = JSON.parse(localStorage.getItem(`portfolio_${userId}`) || "[]");
          const updatedItems = [newItem, ...existingItems];
          localStorage.setItem(`portfolio_${userId}`, JSON.stringify(updatedItems));
          setPortfolioItems(updatedItems);
        }

        toast.success("Відео успішно додано");
        setTitle("");
        setDescription("");
        setVideoLink("");
        fetchPortfolioItems();
        onUpdate();
      } catch (error: any) {
        toast.error("Помилка при додаванні відео");
        console.error(error);
      } finally {
        setIsUploading(false);
      }
      return;
    }
    
    // Перевірка для файлу
    if (!file || !title) {
      toast.error("Будь ласка, заповніть всі обов'язкові поля");
      return;
    }

    try {
      setIsUploading(true);
      const mediaType = getMediaTypeFromFile(file);
      let mediaUrl = "";
      
      // Спроба завантаження в Supabase
      try {
        const bucket = getStorageBucketForMediaType(mediaType);
        const fileExt = file.name.split(".").pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(bucket)
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
        mediaUrl = await readFileAsDataUrl(file);

        const newItem = {
          id: `local_${Date.now()}`,
          title,
          description,
          media_url: mediaUrl,
          media_type: mediaType,
        };

        const updatedItems = [newItem, ...getLocalPortfolioItems(userId)];
        saveLocalPortfolioItems(userId, updatedItems);
        setPortfolioItems(updatedItems);
      }

      toast.success("Файл успішно завантажено");
      setTitle("");
      setDescription("");
      setFile(null);
      await fetchPortfolioItems();
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
      const isLocalOnlyItem = editItem.id.startsWith("local_");

      const updateLocalItem = () => {
        const existingItems = getLocalPortfolioItems(userId);
        const updatedItems = existingItems.map((item) => {
          if (item.id === editItem.id) {
            return {
              ...item,
              title: editTitle,
              description: editDescription,
              media_url: updatedMediaUrl,
              media_type: updatedMediaType,
            };
          }
          return item;
        });

        saveLocalPortfolioItems(userId, updatedItems);
        setPortfolioItems(updatedItems);
      };
      
      // Якщо вибрано новий файл, завантажуємо його
      if (editFile) {
        updatedMediaType = getMediaTypeFromFile(editFile);
        
        // Спроба завантаження в Supabase
        try {
          // Спочатку видаляємо старий файл
          const oldStorageLocation = getStorageLocationFromUrl(editItem.media_url);
          if (oldStorageLocation) {
            try {
              await supabase.storage
                .from(oldStorageLocation.bucket)
                .remove([oldStorageLocation.path]);
            } catch (error) {
              console.warn("Не вдалося видалити старий файл:", error);
            }
          }
          
          // Завантажуємо новий файл
          const bucket = getStorageBucketForMediaType(updatedMediaType);
          const fileExt = editFile.name.split(".").pop();
          const filePath = `${userId}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, editFile);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          updatedMediaUrl = urlData.publicUrl;
        } catch (supabaseError) {
          console.warn("Не вдалося завантажити в Supabase:", supabaseError);
          updatedMediaUrl = await readFileAsDataUrl(editFile);
          updateLocalItem();
        }
      }

      if (isLocalOnlyItem) {
        updateLocalItem();
      } else {
      
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
          updateLocalItem();
        }
      }

      toast.success("Файл успішно оновлено");
      setEditItem(null);
      setEditTitle("");
      setEditDescription("");
      setEditFile(null);
      setEditDialogOpen(false);
      await fetchPortfolioItems();
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
      const isLocalOnlyItem = selectedItem.id.startsWith("local_");

      const removeLocalItem = () => {
        const updatedItems = getLocalPortfolioItems(userId).filter((item) => item.id !== selectedItem.id);
        saveLocalPortfolioItems(userId, updatedItems);
        setPortfolioItems((currentItems) => currentItems.filter((item) => item.id !== selectedItem.id));
      };

      // Спроба видалення з Supabase
      try {
        if (!isLocalOnlyItem) {
          const { error: deleteRecordError } = await supabase
            .from("portfolio")
            .delete()
            .eq("id", selectedItem.id);

          if (deleteRecordError) throw deleteRecordError;

          const storageLocation = getStorageLocationFromUrl(selectedItem.media_url);
          if (storageLocation) {
            await supabase.storage
              .from(storageLocation.bucket)
              .remove([storageLocation.path]);
          }
        }

        removeLocalItem();
      } catch (supabaseError) {
        console.warn("Не вдалося видалити з Supabase:", supabaseError);
        removeLocalItem();
      }

      toast.success("Файл успішно видалено");
      await fetchPortfolioItems();
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
          
          <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "file" | "link")} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Завантажити файл
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Посилання на відео
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="file" className="mt-4 space-y-4">
              <div>
                <Label htmlFor="file">Файл (фото, відео, аудіо)</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Підтримуються: JPG, PNG, MP4, MP3, WAV та інші
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="link" className="mt-4 space-y-4">
              <div>
                <Label htmlFor="videoLink">Посилання на відео</Label>
                <Input
                  id="videoLink"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Підтримуються: YouTube, Vimeo
                </p>
              </div>
            </TabsContent>
          </Tabs>

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
                        className="object-contain w-full h-full"
                      />
                    ) : item.media_type === "audio" ? (
                      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-500 to-pink-500 gap-2">
                        <Music className="h-12 w-12 text-white" />
                        <span className="text-white text-xs">Аудіо</span>
                      </div>
                    ) : (() => {
                      const vd = parseVideoUrl(item.media_url);
                      return vd?.thumbnail ? (
                        <>
                          <img src={vd.thumbnail} alt={item.title} className="object-cover w-full h-full" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
                              <FileVideo className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FileVideo className="h-12 w-12 text-muted-foreground" />
                          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Відео
                          </span>
                        </div>
                      );
                    })()}
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
                  accept="image/*,video/*,audio/*"
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
