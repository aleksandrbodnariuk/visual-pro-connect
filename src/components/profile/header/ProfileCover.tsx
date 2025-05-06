
import React from 'react';

interface ProfileCoverProps {
  coverUrl?: string;
  onError?: (e: React.SyntheticEvent<HTMLDivElement, Event>) => void;
}

export function ProfileCover({ coverUrl, onError }: ProfileCoverProps) {
  const [hasError, setHasError] = React.useState(false);
  const fallbackImage = "https://images.unsplash.com/photo-1487887235947-a955ef187fcc";
  
  // Handle image loading errors
  const handleImageError = () => {
    setHasError(true);
    if (onError) onError({} as React.SyntheticEvent<HTMLDivElement, Event>);
  };
  
  const backgroundImage = hasError || !coverUrl 
    ? `url(${fallbackImage})` 
    : `url(${coverUrl})`;

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-b-lg md:h-64">
      {coverUrl && !hasError && (
        // Preload the image to check if it loads
        <img 
          src={coverUrl}
          className="hidden"
          onError={handleImageError}
          alt=""
        />
      )}
      <div
        className="h-full w-full bg-cover bg-center"
        style={{
          backgroundImage,
          backgroundPosition: "center center",
          backgroundSize: "cover"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}
