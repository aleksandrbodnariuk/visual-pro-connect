
import React from 'react';

interface ProfileCoverProps {
  coverUrl?: string;
  onError?: (e: React.SyntheticEvent<HTMLDivElement, Event>) => void;
}

export function ProfileCover({ coverUrl, onError }: ProfileCoverProps) {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-b-lg md:h-64">
      <div
        className="h-full w-full bg-cover bg-center"
        style={{
          backgroundImage: coverUrl 
            ? `url(${coverUrl})` 
            : "url(https://images.unsplash.com/photo-1487887235947-a955ef187fcc)",
        }}
        onError={onError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}
