import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmbedThumbnail } from "@/hooks/useEmbedThumbnail";
import type { VideoEmbed } from "@/lib/videoEmbed";

interface EmbedThumbnailProps {
  embed: VideoEmbed;
  className?: string;
  imageClassName?: string;
  fallbackLabel?: string | null;
}

export function EmbedThumbnail({
  embed,
  className,
  imageClassName,
  fallbackLabel,
}: EmbedThumbnailProps) {
  const thumbnail = useEmbedThumbnail(embed);

  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt={fallbackLabel || "Прев'ю відео"}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("w-full h-full object-cover", className, imageClassName)}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full bg-muted flex flex-col items-center justify-center gap-2",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Video className="h-5 w-5 text-primary" />
      </div>
      {fallbackLabel && (
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {fallbackLabel}
        </span>
      )}
    </div>
  );
}
