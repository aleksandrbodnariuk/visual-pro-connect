import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Video, Image, Users, X, Loader2, Edit2, Music } from "lucide-react";
import { AudioPlayer } from "@/components/feed/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImageAsFile, dataUrlToBlob } from "@/lib/imageCompression";
import { ImageCropEditor } from "@/components/ui/ImageCropEditor";

interface CreatePostBarProps {
  user: {
    id: string;
    name?: string;
    avatarUrl?: string;
  };
  onSuccess?: () => void;
}

export function CreatePostBar({ user, onSuccess }: CreatePostBarProps) {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const handleAudioClick = () => {
    audioInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max for posts)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Файл занадто великий. Максимум 50MB");
      return;
    }

    if (type === 'photo' && file.type.startsWith('image/')) {
      // Show image editor for photos
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageSrc(reader.result as string);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    } else if (type === 'video') {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (type === 'audio') {
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    }
    
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      toast.loading("Стискання зображення...", { id: "compress" });
      
      // Convert data URL to File
      const blob = dataUrlToBlob(croppedImageUrl);
      const file = new File([blob], `post-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Compress the cropped image
      const compressedFile = await compressImageAsFile(file, 'post');
      toast.dismiss("compress");
      console.log(`Фото стиснуто: ${file.size} -> ${compressedFile.size} байт`);
      
      setMediaFile(compressedFile);
      
      // Create preview from compressed file
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Помилка обробки зображення:', error);
      toast.dismiss("compress");
      toast.error("Помилка обробки зображення");
    }
    
    setShowImageEditor(false);
    setOriginalImageSrc(null);
  };

  const handleEditorClose = () => {
    setShowImageEditor(false);
    setOriginalImageSrc(null);
  };

  const clearMedia = () => {
    if (mediaPreview && mediaFile?.type.startsWith('audio/')) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const openEditorForCurrentImage = () => {
    if (mediaPreview && mediaFile?.type.startsWith('image/')) {
      setOriginalImageSrc(mediaPreview);
      setShowImageEditor(true);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      toast.error("Додайте текст або медіа");
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl = null;

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, mediaFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error("Помилка завантаження медіа");
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);
        
        mediaUrl = urlData.publicUrl;
      }

      // Create post
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim() || null,
          media_url: mediaUrl,
          likes_count: 0,
          comments_count: 0
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error("Помилка створення публікації");
        setIsSubmitting(false);
        return;
      }

      toast.success("Публікацію створено");
      setContent("");
      clearMedia();
      onSuccess?.();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error("Щось пішло не так");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = content.trim() || mediaFile;

  return (
    <>
      <div className="rounded-xl border bg-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {user.name?.split(" ").map(n => n[0]).join("") || "U"}
            </AvatarFallback>
          </Avatar>
          
          <input
            type="text"
            placeholder="Що у вас на думці?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 bg-muted/50 rounded-full px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleVideoClick}
              title="Відео"
            >
              <Video className="h-5 w-5" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handlePhotoClick}
              title="Фото"
            >
              <Image className="h-5 w-5" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-accent-foreground hover:bg-accent"
              onClick={handleAudioClick}
              title="Музика"
            >
              <Music className="h-5 w-5" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-accent-foreground hover:bg-accent"
              title="Подія"
              disabled
            >
              <Users className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Media Preview */}
        {mediaPreview && (
          <div className="mt-3 relative">
            {mediaFile?.type.startsWith('audio/') ? (
              <div className="relative">
                <AudioPlayer src={mediaPreview} title={mediaFile.name.replace(/\.[^.]+$/, '')} />
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative inline-block">
                {mediaFile?.type.startsWith('video/') ? (
                  <video 
                    src={mediaPreview} 
                    className="max-h-64 rounded-lg"
                    controls
                  />
                ) : (
                  <div className="relative group">
                    <img 
                      src={mediaPreview} 
                      alt="Preview" 
                      className="max-h-64 max-w-full rounded-lg object-contain bg-muted/30"
                    />
                    <button
                      type="button"
                      onClick={openEditorForCurrentImage}
                      className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full p-2 shadow-md hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                      title="Редагувати зображення"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {hasContent && (
          <div className="mt-3 flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Публікація...
                </>
              ) : (
                "Опублікувати"
              )}
            </Button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'photo')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'video')}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'audio')}
        />
      </div>

      {/* Image Crop Editor */}
      {originalImageSrc && (
        <ImageCropEditor
          imageSrc={originalImageSrc}
          open={showImageEditor}
          onClose={handleEditorClose}
          onCropComplete={handleCropComplete}
          aspectRatio={undefined}
          title="Редагувати фото публікації"
        />
      )}
    </>
  );
}
