
import React from 'react';

interface BannerPreviewProps {
  bannerUrl: string | null;
}

export function BannerPreview({ bannerUrl }: BannerPreviewProps) {
  return (
    <div className="flex justify-center mb-4">
      <div className="p-2 border rounded-lg bg-muted/50 w-full">
        {bannerUrl ? (
          <img 
            src={bannerUrl} 
            alt="Банер профілю" 
            className="w-full h-48 object-cover rounded"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              // Handle image loading errors
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "https://images.unsplash.com/photo-1487887235947-a955ef187fcc";
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 rounded flex items-center justify-center text-gray-400">
            Банер не встановлено
          </div>
        )}
      </div>
    </div>
  );
}
