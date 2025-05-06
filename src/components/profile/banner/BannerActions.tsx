
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Save, X, Trash } from 'lucide-react';

interface BannerActionsProps {
  fileInputRef: RefObject<HTMLInputElement>;
  previewUrl: string | null;
  isUploading: boolean;
  bannerUrl?: string | null; // Add bannerUrl to props
  onCancel: () => void;
  onUpload: () => Promise<string | null>;
  onRemove?: () => Promise<boolean>;
}

export function BannerActions({ 
  fileInputRef, 
  previewUrl, 
  isUploading, 
  bannerUrl, // Add to destructured props
  onCancel, 
  onUpload,
  onRemove
}: BannerActionsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="banner-upload">Виберіть новий банер</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" /> Вибрати зображення
          </Button>
          
          {onRemove && bannerUrl && !previewUrl && (
            <Button
              type="button"
              variant="destructive"
              onClick={onRemove}
              disabled={isUploading}
            >
              <Trash className="mr-2 h-4 w-4" /> Видалити
            </Button>
          )}
        </div>
      </div>

      {previewUrl && (
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
          >
            <X className="mr-2 h-4 w-4" /> Скасувати
          </Button>
          <Button
            type="button"
            onClick={onUpload}
            disabled={isUploading}
          >
            <Save className="mr-2 h-4 w-4" /> {isUploading ? 'Завантаження...' : 'Зберегти'}
          </Button>
        </div>
      )}
    </>
  );
}
