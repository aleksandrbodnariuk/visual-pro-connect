
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AvatarDisplayProps {
  avatarUrl: string | null;
  userId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarDisplay({ avatarUrl, userId, size = 'lg' }: AvatarDisplayProps) {
  // Визначаємо класи розміру
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32'
  };
  
  const avatarClass = sizeClasses[size];
  
  return (
    <Avatar className={`${avatarClass} mx-auto`}>
      <AvatarImage
        src={avatarUrl || undefined}
        alt="Аватар користувача"
        className="object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = '/placeholder.svg';
        }}
      />
      <AvatarFallback className="text-lg">
        {userId?.substring(0, 2) || "КР"}
      </AvatarFallback>
    </Avatar>
  );
}
