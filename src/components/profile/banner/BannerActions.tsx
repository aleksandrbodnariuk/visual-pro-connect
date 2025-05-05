
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Save, X } from 'lucide-react';

interface BannerActionsProps {
  fileInputRef: RefObject<HTMLInputElement>;
  previewUrl: string | null;
  isUploading: boolean;
  onCancel: () => void;
  onUpload: () => Promise<void>;
}

export function BannerActions({ 
  fileInputRef, 
  previewUrl, 
  isUploading, 
  onCancel, 
  onUpload 
}: BannerActionsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="banner-upload">Виберіть новий банер</Label>
        <input
          id="banner-upload"
          type="file"
          className="hidden"
          accept="image/*"
          ref={fileInputRef}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" /> Вибрати зображення
          </Button>
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
