
import { Image } from "lucide-react";

interface LogoDisplayProps {
  logoUrl: string | null;
}

export function LogoDisplay({ logoUrl }: LogoDisplayProps) {
  return (
    <div className="flex justify-center mb-4">
      <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Логотип сайту" 
            className="max-h-24 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-24 w-24 rounded-full flex flex-col items-center justify-center text-gray-400 border border-dashed">
            <Image className="h-8 w-8 mb-2" />
            <span className="text-xs">Логотип для завантаження</span>
          </div>
        )}
      </div>
    </div>
  );
}
