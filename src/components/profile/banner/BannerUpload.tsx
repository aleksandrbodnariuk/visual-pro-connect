
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BannerPreview } from './BannerPreview';
import { BannerActions } from './BannerActions';
import { useBannerUpload } from './useBannerUpload';
import { ImageCropEditor } from '@/components/ui/ImageCropEditor';

interface BannerUploadProps {
  userId: string;
  existingBannerUrl?: string | null;
  onComplete?: (url: string) => void;
}

export function BannerUpload({ userId, existingBannerUrl, onComplete }: BannerUploadProps) {
  const {
    bannerUrl,
    previewUrl,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleUpload,
    handleCancel,
    removeBanner,
    uploadCroppedImage
  } = useBannerUpload(userId, existingBannerUrl, onComplete);

  const [showEditor, setShowEditor] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 15 * 1024 * 1024; // 15MB for editing
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
        <CardTitle>Банер профілю</CardTitle>
        <CardDescription>Завантажте та відредагуйте банер для вашого профілю</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BannerPreview bannerUrl={previewUrl || bannerUrl} />
        
        <BannerActions 
          fileInputRef={fileInputRef}
          previewUrl={previewUrl}
          isUploading={isUploading}
          bannerUrl={bannerUrl}
          onCancel={handleCancel}
          onUpload={handleUpload}
          onRemove={removeBanner}
        />

        {/* Hidden file input element */}
        <input 
          type="file" 
          id="banner-upload"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*" 
          className="hidden" 
        />

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
            aspectRatio={1920 / 600} // Banner aspect ratio
            title="Редагувати банер"
            circularCrop={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
