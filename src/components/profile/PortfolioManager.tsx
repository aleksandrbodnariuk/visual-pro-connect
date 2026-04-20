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
  uploadPortfolioImageVariants,
  deletePortfolioVariants,
} from "@/lib/portfolioMediaPipeline";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_preview_url: string | null;
  media_display_url: string | null;
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
 * Pre-upload validation. Image processing now happens in the media pipeline,
 * which generates preview + display variants automatically.
 */
function validateForUpload(file: File) {
  if (file.size > MAX_INPUT_BYTES && !file.type.startsWith('image/')) {
    throw new Error(`Файл занадто великий (${(file.size / 1024 / 1024).toFixed(1)}MB). Максимум 10MB.`);
  }
}

interface UploadProgressItem {
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function PortfolioManager({ userId, onUpdate }: PortfolioManagerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) throw error;
      const items = (data || []) as PortfolioItem[];
      setPortfolioItems(items);
      setHasMore(items.length === PAGE_SIZE);
    } catch (error: any) {
      console.error("Помилка при завантаженні портфоліо:", error);
      toast.error("Помилка при завантаженні портфоліо");
      setPortfolioItems([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreItems = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = portfolioItems.length;
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const more = (data || []) as PortfolioItem[];
      setPortfolioItems(prev => {
        const existing = new Set(prev.map(p => p.id));
        return [...prev, ...more.filter(p => !existing.has(p.id))];
      });
      setHasMore(more.length === PAGE_SIZE);
    } catch (error) {
      console.error("Не вдалося завантажити більше:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleEditFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setEditFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    // ---- VIDEO LINK MODE ----
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
        const { error: insertError } = await supabase
          .from("portfolio")
          .insert({ user_id: userId, title, description, media_url: videoLink, media_type: "video" });
        if (insertError) throw insertError;

        toast.success("Відео успішно додано");
        setTitle("");
        setDescription("");
        setVideoLink("");
        await fetchPortfolioItems();
        onUpdate();
      } catch (error: any) {
        console.error("Помилка при додаванні відео:", error);
        toast.error("Помилка при додаванні відео");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // ---- FILE UPLOAD MODE (multi) ----
    if (files.length === 0 || !title) {
      toast.error("Будь ласка, заповніть назву та оберіть хоча б один файл");
      return;
    }

    // Pre-validate
    for (const f of files) {
      try {
        validateForUpload(f);
      } catch (e: any) {
        toast.error(`${f.name}: ${e?.message || "Файл не відповідає вимогам"}`);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(
      files.map((f) => ({ name: f.name, status: "pending" as const }))
    );

    let successCount = 0;
    let failCount = 0;
    const isMulti = files.length > 1;

    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      setUploadProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p))
      );

      try {
        const mediaType = getMediaTypeFromFile(currentFile);
        const variants = await uploadPortfolioImageVariants(currentFile, userId);

        // For multi-upload, append index to title for uniqueness
        const itemTitle = isMulti ? `${title} (${i + 1})` : title;

        const { error: insertError } = await supabase
          .from("portfolio")
          .insert({
            user_id: userId,
            title: itemTitle,
            description,
            media_url: variants.originalUrl,
            media_preview_url: variants.previewUrl,
            media_display_url: variants.displayUrl,
            media_type: mediaType,
          });
        if (insertError) throw insertError;

        successCount++;
        setUploadProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p))
        );
      } catch (error: any) {
        failCount++;
        console.error(`Помилка завантаження ${currentFile.name}:`, error);
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? { ...p, status: "error", error: error?.message || "Помилка" }
              : p
          )
        );
      }
    }

    if (successCount > 0) {
      toast.success(
        failCount === 0
          ? `Завантажено: ${successCount}`
          : `Завантажено: ${successCount}, помилок: ${failCount}`
      );
      setTitle("");
      setDescription("");
      setFiles([]);
      await fetchPortfolioItems();
      onUpdate();
    } else {
      toast.error("Не вдалося завантажити жодного файлу");
    }

    // Clear progress after a short delay so user can see results
    setTimeout(() => setUploadProgress([]), 2500);
    setIsUploading(false);
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
      let updatedPreviewUrl = editItem.media_preview_url;
      let updatedDisplayUrl = editItem.media_display_url;
      let updatedMediaType = editItem.media_type;

      if (editFile) {
        try {
          validateForUpload(editFile);
        } catch (e: any) {
          toast.error(e?.message || "Файл не відповідає вимогам");
          setIsUploading(false);
          return;
        }

        updatedMediaType = getMediaTypeFromFile(editFile);

        // Best-effort cleanup of old variants before uploading new ones
        await deletePortfolioVariants([
          editItem.media_url,
          editItem.media_preview_url,
          editItem.media_display_url,
        ]);

        const variants = await uploadPortfolioImageVariants(editFile, userId);
        updatedMediaUrl = variants.originalUrl;
        updatedPreviewUrl = variants.previewUrl;
        updatedDisplayUrl = variants.displayUrl;
      }

      const { error: updateError } = await supabase
        .from("portfolio")
        .update({
          title: editTitle,
          description: editDescription,
          media_url: updatedMediaUrl,
          media_preview_url: updatedPreviewUrl,
          media_display_url: updatedDisplayUrl,
          media_type: updatedMediaType,
        })
        .eq("id", editItem.id);
      if (updateError) throw updateError;

      toast.success("Файл успішно оновлено");
      setEditItem(null);
      setEditTitle("");
      setEditDescription("");
      setEditFile(null);
      setEditDialogOpen(false);
      await fetchPortfolioItems();
      onUpdate();
    } catch (error: any) {
      console.error("Помилка при оновленні файлу:", error);
      toast.error(error?.message || "Помилка при оновленні файлу");
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
      const { error: deleteRecordError } = await supabase
        .from("portfolio")
        .delete()
        .eq("id", selectedItem.id);

      if (deleteRecordError) throw deleteRecordError;

      // Clean up all variants (legacy + preview + display) from storage
      await deletePortfolioVariants([
        selectedItem.media_url,
        selectedItem.media_preview_url,
        selectedItem.media_display_url,
      ]);
      // Audio files live in the 'posts' bucket (legacy convention) — fall back to old cleanup
      const storageLocation = getStorageLocationFromUrl(selectedItem.media_url);
      if (storageLocation && storageLocation.bucket !== 'portfolio') {
        try {
          await supabase.storage.from(storageLocation.bucket).remove([storageLocation.path]);
        } catch (e) {
          console.warn("Не вдалося видалити файл зі сховища:", e);
        }
      }

      setPortfolioItems(prev => prev.filter(i => i.id !== selectedItem.id));
      toast.success("Файл успішно видалено");
      onUpdate();
    } catch (error: any) {
      console.error("Помилка при видаленні файлу:", error);
      toast.error("Помилка при видаленні файлу");
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
                  Зображення стискаються в WebP. Максимум 10MB до стиснення / 5MB після.
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
                        loading="lazy"
                        decoding="async"
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
                          <img src={vd.thumbnail} alt={item.title} className="object-cover w-full h-full" loading="lazy" decoding="async" />
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
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={loadMoreItems} disabled={loadingMore}>
                  {loadingMore ? 'Завантаження...' : 'Показати ще'}
                </Button>
              </div>
            )}
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
