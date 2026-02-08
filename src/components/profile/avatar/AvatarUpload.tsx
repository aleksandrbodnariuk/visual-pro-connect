
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from './AvatarDisplay';
import { useAvatarUpload } from './useAvatarUpload';
import { ImageCropEditor } from '@/components/ui/ImageCropEditor';
import { Crop, Loader2 } from 'lucide-react';

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
      await uploadCroppedImage(croppedImage);
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
      </CardContent>
    </Card>
  );
}
