
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePublicationModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userId: string;
  userName?: string;
  onSuccess?: () => void;
}

export function CreatePublicationModal({ 
  open, 
  onOpenChange,
  userId,
  userName,
  onSuccess
}: CreatePublicationModalProps) {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleClearImage = () => {
    setMediaFile(null);
    setPreviewUrl(null);
  };
  
  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      toast.error("Додайте текст або зображення");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let mediaUrl = null;
      
      // Upload media if exists
      if (mediaFile) {
        try {
          // Try to upload to Supabase Storage
          const fileExt = mediaFile.name.split('.').pop();
          const filePath = `${userId}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('posts')
            .upload(filePath, mediaFile);
          
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('posts')
            .getPublicUrl(filePath);
            
          mediaUrl = urlData.publicUrl;
        } catch (storageError) {
          console.error("Error uploading to storage:", storageError);
          
          // Fallback: use base64 for demo/development
          if (previewUrl) {
            mediaUrl = previewUrl;
          }
        }
      }
      
      // Create post in database
      try {
        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: userId,
            content,
            media_url: mediaUrl,
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
      } catch (dbError) {
        console.error("Error saving to database:", dbError);
        
        // Fallback for demo: save to localStorage
        const localPosts = JSON.parse(localStorage.getItem('posts') || '[]');
        const newPost = {
          id: `local_${Date.now()}`,
          userId: userId,
          content,
          mediaUrl: mediaUrl,
          createdAt: new Date().toISOString(),
          likesCount: 0,
          commentsCount: 0
        };
        
        localPosts.unshift(newPost);
        localStorage.setItem('posts', JSON.stringify(localPosts));
      }
      
      // Reset form
      setContent("");
      setMediaFile(null);
      setPreviewUrl(null);
      
      if (onSuccess) {
        onSuccess();
      }
      
      if (onOpenChange) {
        onOpenChange(false);
      }
      
      toast.success("Публікацію створено");
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Не вдалося створити публікацію");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Створити публікацію</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="content" className="sr-only">Текст публікації</Label>
            <Textarea
              id="content"
              placeholder="Напишіть що у вас нового..."
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          
          {previewUrl && (
            <div className="relative rounded-md overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Попередній перегляд" 
                className="w-full max-h-[300px] object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleClearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div>
            <Label htmlFor="media" className="block mb-2">Додати зображення</Label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-2" 
                onClick={() => document.getElementById('media')?.click()}
                type="button"
              >
                <Image className="h-4 w-4" />
                Завантажити
              </Button>
              <Input
                id="media"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-sm text-muted-foreground">
                {mediaFile ? mediaFile.name : 'Зображення не вибрано'}
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Створення...' : 'Опублікувати'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
