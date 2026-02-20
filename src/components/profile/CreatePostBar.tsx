import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => photoInputRef.current?.click();
  const handleVideoClick = () => videoInputRef.current?.click();
  const handleAudioClick = () => audioInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Файл занадто великий. Максимум 50MB");
      return;
    }

    // Розгортаємо форму при додаванні медіа
    setIsExpanded(true);

    if (type === 'photo' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageSrc(reader.result as string);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    } else if (type === 'video') {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (type === 'audio') {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }

    if (e.target) e.target.value = '';
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      toast.loading("Стискання зображення...", { id: "compress" });
      const blob = dataUrlToBlob(croppedImageUrl);
      const file = new File([blob], `post-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const compressedFile = await compressImageAsFile(file, 'post');
      toast.dismiss("compress");

      setMediaFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result as string);
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

      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, mediaFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error("Помилка завантаження медіа");
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
      }

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
      setIsExpanded(false);
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
        {/* Рядок: аватар + textarea або placeholder */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 mt-0.5">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {user.name?.split(" ").map(n => n[0]).join("") || "U"}
            </AvatarFallback>
          </Avatar>

          {isExpanded ? (
            <Textarea
              placeholder="Що у вас на думці? Напишіть опис публікації..."
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 10000))}
              rows={3}
              className="flex-1 resize-none bg-muted/30 border-0 focus-visible:ring-1 text-sm"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex-1 text-left bg-muted/50 rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Що у вас на думці?
            </button>
          )}
        </div>

        {/* Медіа превʼю */}
        {mediaPreview && (
          <div className="mt-3 rounded-lg overflow-hidden border bg-muted/20">
            {mediaFile?.type.startsWith('audio/') ? (
              <div className="relative p-2">
                <AudioPlayer src={mediaPreview} title={mediaFile.name.replace(/\.[^.]+$/, '')} />
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:opacity-90 z-10"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : mediaFile?.type.startsWith('video/') ? (
              <div className="relative">
                <video
                  src={mediaPreview}
                  className="w-full max-h-80 object-contain"
                  controls
                />
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:opacity-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative group">
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full max-h-80 object-contain"
                />
                <button
                  type="button"
                  onClick={openEditorForCurrentImage}
                  className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full p-2 shadow-md hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                  title="Редагувати зображення"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:opacity-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Розділювач + кнопки медіа + кнопка публікації */}
        <div className="border-t mt-3 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={handleVideoClick}
            >
              <Video className="h-5 w-5" />
              <span className="text-xs hidden sm:inline">Відео</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 sm:px-3 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 gap-1.5"
              onClick={handlePhotoClick}
            >
              <Image className="h-5 w-5" />
              <span className="text-xs hidden sm:inline">Фото</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 sm:px-3 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 gap-1.5"
              onClick={handleAudioClick}
            >
              <Music className="h-5 w-5" />
              <span className="text-xs hidden sm:inline">Музика</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 sm:px-3 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 gap-1.5"
              disabled
              title="Подія"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs hidden sm:inline">Подія</span>
            </Button>
          </div>

          {hasContent && (
            <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Публікація...
                </>
              ) : (
                "Опублікувати"
              )}
            </Button>
          )}
        </div>

        {/* Hidden file inputs */}
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFileChange(e, 'photo')} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => handleFileChange(e, 'video')} />
        <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a" className="hidden"
          onChange={(e) => handleFileChange(e, 'audio')} />
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
