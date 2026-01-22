import { VideoEmbed } from "@/lib/videoEmbed";
import { ExternalLink } from "lucide-react";

interface VideoPreviewProps {
  embed: VideoEmbed;
}

export function VideoPreview({ embed }: VideoPreviewProps) {
  if (embed.platform === 'youtube') {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted">
        <div className="aspect-video">
          <iframe
            src={embed.embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="YouTube відео"
          />
        </div>
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">YOUTUBE.COM</span>
        </div>
      </div>
    );
  }
  
  if (embed.platform === 'instagram') {
    return (
      <div className="rounded-lg overflow-hidden border">
        <iframe
          src={embed.embedUrl}
          className="w-full min-h-[400px]"
          frameBorder="0"
          scrolling="no"
          title="Instagram пост"
        />
      </div>
    );
  }

  if (embed.platform === 'tiktok') {
    return (
      <a 
        href={embed.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-2 text-primary hover:underline text-sm"
      >
        <ExternalLink className="h-4 w-4" />
        TikTok відео
      </a>
    );
  }
  
  // Для інших посилань - просто відображаємо як клікабельне посилання
  return (
    <a 
      href={embed.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center gap-2 text-primary hover:underline text-sm break-all"
    >
      <ExternalLink className="h-4 w-4 shrink-0" />
      {embed.originalUrl}
    </a>
  );
}
