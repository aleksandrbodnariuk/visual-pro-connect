
import { BannerUpload as BannerUploadComponent } from './banner/BannerUpload';

interface BannerUploadProps {
  userId: string;
  existingBannerUrl?: string | null;
  onComplete?: (url: string) => void;
}

export function BannerUpload(props: BannerUploadProps) {
  return <BannerUploadComponent {...props} />;
}
