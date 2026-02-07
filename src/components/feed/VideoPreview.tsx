import { VideoEmbed } from "@/lib/videoEmbed";
import { ExternalLink } from "lucide-react";
import { LinkPreview } from "./LinkPreview";

interface VideoPreviewProps {
  embed: VideoEmbed;
}

export function VideoPreview({ embed }: VideoPreviewProps) {
  // Визначаємо CSS клас для контейнера залежно від орієнтації
  const aspectClass = embed.isVertical 
    ? "aspect-[9/16] max-w-[320px] mx-auto"  // Вертикальне - 9:16, центроване
    : "aspect-video w-full";  // Горизонтальне - 16:9, на всю ширину

  if (embed.platform === 'youtube') {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted">
        <div className={aspectClass}>
          <iframe
            src={embed.embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="YouTube відео"
          />
        </div>
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            {embed.isVertical ? 'YOUTUBE SHORTS' : 'YOUTUBE.COM'}
          </span>
        </div>
      </div>
    );
  }
  
  if (embed.platform === 'instagram') {
    return (
      <div className="rounded-lg overflow-hidden border max-w-[320px] mx-auto">
        <iframe
          src={embed.embedUrl}
          className="w-full aspect-[9/16]"
          frameBorder="0"
          scrolling="no"
          title="Instagram пост"
        />
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted">
          <span className="font-medium">INSTAGRAM</span>
        </div>
      </div>
    );
  }

  if (embed.platform === 'tiktok') {
    return (
      <div className="rounded-lg overflow-hidden border max-w-[320px] mx-auto bg-muted">
        <div className="aspect-[9/16] flex items-center justify-center bg-black/5">
          <a 
            href={embed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 text-primary hover:text-primary/80 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ExternalLink className="h-8 w-8" />
            </div>
            <span className="font-medium">Відкрити в TikTok</span>
          </a>
        </div>
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">TIKTOK</span>
        </div>
      </div>
    );
  }

  if (embed.platform === 'facebook') {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted">
        <div className={aspectClass}>
          <iframe
            src={embed.embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            title="Facebook відео"
          />
        </div>
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            {embed.isVertical ? 'FACEBOOK REELS' : 'FACEBOOK.COM'}
          </span>
        </div>
      </div>
    );
  }
  
  // Для інших посилань - показуємо прев'ю з Open Graph
  return <LinkPreview url={embed.originalUrl} />;
}
