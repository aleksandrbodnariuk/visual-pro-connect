
import React from 'react';
import { Button } from '@/components/ui/button';
import { AvatarDisplay } from './AvatarDisplay';
import { useAvatarUpload } from './useAvatarUpload';

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
    handleFileChange
  } = useAvatarUpload(userId, avatarUrl, onAvatarChange);

  return (
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
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          id={`avatar-upload-${userId}`}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Завантаження...' : 'Змінити аватар'}
        </Button>
      </div>
    </div>
  );
}
