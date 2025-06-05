
import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadToStorage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

interface CreatePublicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function CreatePublicationModal({ 
  open, 
  onOpenChange, 
  userId,
  onSuccess 
}: CreatePublicationModalProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Будь ласка, напишіть текст публікації');
      return;
    }

    setIsUploading(true);
    
    try {
      let mediaUrl = null;
      
      // Завантажуємо медіа файл якщо він є
      if (selectedFile) {
        const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
        const uniqueFileName = `post-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        const filePath = `posts/${uniqueFileName}`;
        
        console.log('Завантаження файлу:', uniqueFileName);
        mediaUrl = await uploadToStorage('posts', filePath, selectedFile, selectedFile.type);
        console.log('Файл завантажено:', mediaUrl);
      }

      // Зберігаємо публікацію в базі даних
      const postData = {
        user_id: userId,
        content: content,
        media_url: mediaUrl,
        category: category || null,
        likes_count: 0,
        comments_count: 0
      };

      console.log('Створення публікації:', postData);

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error('Помилка створення публікації:', error);
        toast.error('Помилка при створенні публікації');
        return;
      }

      console.log('Публікацію створено:', data);
      toast.success('Публікацію успішно створено!');
      
      // Очищаємо форму
      setContent("");
      setCategory("");
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Закриваємо модальне вікно
      onOpenChange(false);
      
      // Викликаємо callback для оновлення списку публікацій
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Помилка при створенні публікації:', error);
      toast.error('Не вдалося створити публікацію');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Створити публікацію</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="content">Текст публікації</Label>
            <Textarea
              id="content"
              placeholder="Поділіться своїми думками..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div>
            <Label htmlFor="category">Категорія (опціонально)</Label>
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
            
            {!selectedFile ? (
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
                  {selectedFile.type.startsWith('image/') ? (
                    <img 
                      src={previewUrl || ''} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded"
                    />
                  ) : (
                    <video 
                      src={previewUrl || ''} 
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
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading || !content.trim()}
              className="flex-1"
            >
              {isUploading ? "Створення..." : "Опублікувати"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Скасувати
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
