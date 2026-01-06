import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadToStorage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const postSchema = z.object({
  content: z.string()
    .min(1, "Текст публікації не може бути порожнім")
    .max(10000, "Текст публікації не може перевищувати 10000 символів"),
  category: z.string().max(50).optional().nullable()
});

interface EditPublicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content: string;
    media_url?: string | null;
    category?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function EditPublicationModal({ 
  open, 
  onOpenChange, 
  post,
  onSuccess 
}: EditPublicationModalProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExistingMedia, setKeepExistingMedia] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Синхронізуємо стан при зміні поста
  useEffect(() => {
    if (post && open) {
      setContent(post.content || "");
      setCategory(post.category || "");
      setPreviewUrl(post.media_url || null);
      setSelectedFile(null);
      setKeepExistingMedia(!!post.media_url);
    }
  }, [post, open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Підтримуються лише зображення та відео');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Розмір файлу не повинен перевищувати 50MB');
      return;
    }

    setSelectedFile(file);
    setKeepExistingMedia(false);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!post) return;

    const validation = postSchema.safeParse({ content: content.trim(), category: category || null });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Помилка валідації");
      return;
    }

    setIsUpdating(true);
    
    try {
      let mediaUrl = keepExistingMedia ? post.media_url : null;
      
      // Завантажуємо новий файл якщо обрано
      if (selectedFile) {
        const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
        const uniqueFileName = `post-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        const filePath = `posts/${uniqueFileName}`;
        
        mediaUrl = await uploadToStorage('posts', filePath, selectedFile, selectedFile.type);
      }

      // Оновлюємо публікацію в базі даних
      const { error } = await supabase
        .from('posts')
        .update({ 
          content: content.trim(), 
          category: category || null,
          media_url: mediaUrl 
        })
        .eq('id', post.id);

      if (error) {
        console.error('Помилка оновлення публікації:', error);
        toast.error('Помилка при оновленні публікації');
        return;
      }

      toast.success('Публікацію оновлено!');
      onOpenChange(false);
      onSuccess?.();
      
    } catch (error) {
      console.error('Помилка оновлення:', error);
      toast.error('Не вдалося оновити публікацію');
    } finally {
      setIsUpdating(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setKeepExistingMedia(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!post) return null;

  const isImage = previewUrl && (
    selectedFile?.type.startsWith('image/') || 
    (!selectedFile && (previewUrl.includes('.jpg') || previewUrl.includes('.jpeg') || previewUrl.includes('.png') || previewUrl.includes('.gif') || previewUrl.includes('.webp')))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Редагувати публікацію</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-content">Текст публікації</Label>
            <Textarea
              id="edit-content"
              placeholder="Поділіться своїми думками..."
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 10000))}
              rows={4}
              className="resize-none"
              maxLength={10000}
            />
            <p className="text-xs text-muted-foreground mt-1">{content.length}/10000</p>
          </div>

          <div>
            <Label htmlFor="edit-category">Категорія (опціонально)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть категорію" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photographer">Фотограф</SelectItem>
                <SelectItem value="videographer">Відеограф</SelectItem>
                <SelectItem value="musician">Музикант</SelectItem>
                <SelectItem value="host">Ведучий</SelectItem>
                <SelectItem value="pyrotechnician">Піротехнік</SelectItem>
                <SelectItem value="other">Інше</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Медіафайл (опціонально)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!previewUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Додати зображення або відео (до 50MB)
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  {isImage ? (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded"
                    />
                  ) : (
                    <video 
                      src={previewUrl} 
                      className="w-full h-32 object-cover rounded"
                      controls
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeFile}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {!selectedFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    Замінити файл
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={isUpdating || !content.trim()}
              className="flex-1"
            >
              {isUpdating ? "Збереження..." : "Зберегти зміни"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Скасувати
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
