import { useEffect, useMemo, useState } from "react";
import { VideoEmbed } from "@/lib/videoEmbed";
import { ExternalLink, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LinkPreview } from "./LinkPreview";

interface VideoPreviewProps {
  embed: VideoEmbed;
}

interface FacebookPreviewMeta {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
  favicon?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
}

interface FacebookLayout {
  isVertical: boolean;
  aspectRatio: number;
}

export function VideoPreview({ embed }: VideoPreviewProps) {
  const [facebookLayout, setFacebookLayout] = useState<FacebookLayout | null>(
    embed.platform === "facebook"
      ? {
          isVertical: !!embed.isVertical,
          aspectRatio: embed.isVertical ? 9 / 16 : 16 / 9,
        }
      : null,
  );
  const [facebookPreview, setFacebookPreview] = useState<FacebookPreviewMeta | null>(null);

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
        setFacebookPreview(preview);
        const width = preview.videoWidth ?? preview.imageWidth ?? null;
        const height = preview.videoHeight ?? preview.imageHeight ?? null;

        if (width && height) {
          setFacebookLayout({
            isVertical: height > width,
            aspectRatio: width / height,
          });
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
    ? (facebookLayout?.isVertical ?? false)
    : !!embed.isVertical;

  const facebookAspectRatio = facebookLayout?.aspectRatio ?? (isVertical ? 9 / 16 : 16 / 9);

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
    if (!facebookPreview?.image) {
      return <LinkPreview url={embed.originalUrl} />;
    }

    if (facebookPlaying) {
      const iframeSrc = isVertical
        ? `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(embed.originalUrl)}&show_text=false&width=320`
        : `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(embed.originalUrl)}&show_text=false&autoplay=true`;

      return (
        <div className={`rounded-lg overflow-hidden border bg-black ${isVertical ? 'max-w-[420px] mx-auto' : ''}`}>
          <div className="relative w-full" style={{ aspectRatio: `${facebookAspectRatio}` }}>
            <iframe
              src={iframeSrc}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              title="Facebook відео"
              style={{ border: 'none' }}
            />
          </div>
          <div className="p-2 flex items-center justify-between bg-muted">
            <span className="text-xs font-medium text-muted-foreground">
              {isVertical ? 'FACEBOOK REELS' : 'FACEBOOK.COM'}
            </span>
            <a
              href={embed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Facebook
            </a>
          </div>
        </div>
      );
    }
    
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFacebookPlaying(true)}
        onKeyDown={(e) => e.key === 'Enter' && setFacebookPlaying(true)}
        className={`block rounded-lg overflow-hidden border bg-muted hover:bg-muted/80 transition-colors group cursor-pointer ${isVertical ? 'max-w-[420px] mx-auto' : ''}`}
      >
        <div
          className="relative w-full bg-black"
          style={{ aspectRatio: `${facebookAspectRatio}` }}
        >
          <img
            src={facebookPreview.image}
            alt={facebookPreview.title || (isVertical ? "Facebook Reel" : "Facebook відео")}
            loading="lazy"
            className="h-full w-full object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
              <Play className="ml-1 h-7 w-7 fill-current" />
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">
              {isVertical ? 'FACEBOOK REELS' : 'FACEBOOK.COM'}
            </span>
            <a
              href={embed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Відкрити у Facebook
            </a>
          </div>
          {facebookPreview.title && (
            <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
              {facebookPreview.title}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  return <LinkPreview url={embed.originalUrl} />;
}
