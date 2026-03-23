import { useEffect, useMemo, useState } from "react";
import { VideoEmbed } from "@/lib/videoEmbed";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LinkPreview } from "./LinkPreview";

interface VideoPreviewProps {
  embed: VideoEmbed;
}

interface FacebookPreviewMeta {
  imageWidth?: number | null;
  imageHeight?: number | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
}

export function VideoPreview({ embed }: VideoPreviewProps) {
  const [facebookIsVertical, setFacebookIsVertical] = useState<boolean | null>(embed.isVertical ?? null);

  useEffect(() => {
    if (embed.platform !== "facebook") return;

    let isMounted = true;

    const resolveFacebookOrientation = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-link-preview", {
          body: { url: embed.originalUrl },
        });

        if (error || !data?.success || !isMounted) return;

        const preview = (data.data ?? {}) as FacebookPreviewMeta;
        const width = preview.videoWidth ?? preview.imageWidth ?? null;
        const height = preview.videoHeight ?? preview.imageHeight ?? null;

        if (width && height) {
          setFacebookIsVertical(height > width);
        }
      } catch {
        // fallback to URL-based/default layout
      }
    };

    resolveFacebookOrientation();

    return () => {
      isMounted = false;
    };
  }, [embed.originalUrl, embed.platform]);

  const isVertical = embed.platform === "facebook"
    ? (facebookIsVertical ?? false)
    : !!embed.isVertical;

  const aspectClass = useMemo(
    () => (isVertical ? "aspect-[9/16] max-w-[320px] mx-auto" : "aspect-video w-full"),
    [isVertical]
  );

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
            {isVertical ? 'YOUTUBE SHORTS' : 'YOUTUBE.COM'}
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
    const fbWidth = isVertical ? 320 : 560;
    const fbHeight = isVertical ? 568 : 315;
    const embedSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(embed.originalUrl)}&show_text=false&width=${fbWidth}&height=${fbHeight}`;
    
    return (
      <div className={`rounded-lg overflow-hidden border bg-muted ${isVertical ? 'max-w-[320px] mx-auto' : ''}`}>
        <iframe
          src={embedSrc}
          width={fbWidth}
          height={fbHeight}
          className="w-full border-0"
          style={{ aspectRatio: isVertical ? '9/16' : '16/9' }}
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          scrolling="no"
          title={isVertical ? "Facebook Reel" : "Facebook відео"}
        />
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            {isVertical ? 'FACEBOOK REELS' : 'FACEBOOK.COM'}
          </span>
        </div>
      </div>
    );
  }
  
  return <LinkPreview url={embed.originalUrl} />;
}
