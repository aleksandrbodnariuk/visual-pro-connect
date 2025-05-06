
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BannerPreview } from './BannerPreview';
import { BannerActions } from './BannerActions';
import { useBannerUpload } from './useBannerUpload';

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
    removeBanner
  } = useBannerUpload(userId, existingBannerUrl, onComplete);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Банер профілю</CardTitle>
        <CardDescription>Завантажте новий банер для вашого профілю</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BannerPreview bannerUrl={previewUrl || bannerUrl} />
        
        <BannerActions 
          fileInputRef={fileInputRef}
          previewUrl={previewUrl}
          isUploading={isUploading}
          bannerUrl={bannerUrl} // Pass bannerUrl to BannerActions
          onCancel={handleCancel}
          onUpload={handleUpload}
          onRemove={removeBanner}
        />

        {/* Hidden file input element */}
        <input 
          type="file" 
          id="banner-upload"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*" 
          className="hidden" 
        />
      </CardContent>
    </Card>
  );
}
