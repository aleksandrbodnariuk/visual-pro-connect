
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from './AvatarDisplay';
import { useAvatarUpload } from './useAvatarUpload';
import { ImageCropEditor } from '@/components/ui/ImageCropEditor';
import { Crop, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
}

export function AvatarUpload({ userId, avatarUrl, onAvatarChange }: AvatarUploadProps) {
  const {
    avatarUrl: currentAvatarUrl,
    isUploading,
    fileInputRef,
    handleFileChange,
    uploadCroppedImage
  } = useAvatarUpload(userId, avatarUrl, onAvatarChange);

  const [showEditor, setShowEditor] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const publishToFeed = async () => {
    if (!publishUrl) return;
    setPublishing(true);
    const { error } = await supabase.from('posts').insert([{
      user_id: userId,
      media_url: publishUrl,
      category: 'photo',
      content: 'Оновив(ла) фото профілю',
    }]);
    setPublishing(false);
    setPublishUrl(null);
    if (error) toast.error('Не вдалося опублікувати фото в стрічці');
    else toast.success('Фото профілю опубліковано в стрічці новин');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB for editing
    if (file.size > maxSize) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    // Read file for editor
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target?.result as string);
      setShowEditor(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedImage: string) => {
    if (uploadCroppedImage) {
      const url = await uploadCroppedImage(croppedImage);
      if (url) setPublishUrl(url);
    }
    setSelectedImageSrc(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Аватар профілю</CardTitle>
        <CardDescription>Редагувати зображення профілю</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <AvatarDisplay 
            avatarUrl={currentAvatarUrl} 
            userId={userId}
            size="xl"
          />
          
          <div className="flex gap-2 justify-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="hidden"
              id={`avatar-upload-${userId}`}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Завантаження...
                </>
              ) : (
                <>
                  <Crop className="h-4 w-4" />
                  Змінити аватар
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Image Crop Editor */}
        {selectedImageSrc && (
          <ImageCropEditor
            imageSrc={selectedImageSrc}
            open={showEditor}
            onClose={() => {
              setShowEditor(false);
              setSelectedImageSrc(null);
            }}
            onCropComplete={handleCropComplete}
            aspectRatio={1}
            title="Редагувати аватар"
            circularCrop={true}
          />
        )}
        <AlertDialog open={!!publishUrl} onOpenChange={(o) => { if (!o && !publishing) setPublishUrl(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Опублікувати фото в стрічці новин?</AlertDialogTitle>
              <AlertDialogDescription>
                Друзі побачать нове фото профілю у стрічці та зможуть ставити реакції й коментувати. Якщо відмовитесь — фото зміниться лише у профілі.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {publishUrl && <img src={publishUrl} alt="Нове фото профілю" className="mx-auto h-40 w-40 rounded-full object-cover" />}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={publishing}>Ні, лише в профілі</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); publishToFeed(); }} disabled={publishing}>
                {publishing ? 'Публікація...' : 'Опублікувати'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
