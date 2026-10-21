import { useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
  favicon: string | null;
}

interface LinkPreviewProps {
  url: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchPreview = async () => {
      setLoading(true);
      setError(false);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data, error: fetchError } = await supabase.functions.invoke('fetch-link-preview', {
            body: { url }
          });
          if (!fetchError && data?.success && data.data) {
            if (!cancelled) { setPreview(data.data); setLoading(false); }
            return;
          }
        } catch {
          /* retry */
        }
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      if (!cancelled) { setError(true); setLoading(false); }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [url]);

  // Loading state
  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden bg-muted/30">
        <Skeleton className="h-40 w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  // Error or no preview - show compact article card
  if (error || !preview) {
    let host = url;
    try { host = new URL(url).hostname.replace('www.', ''); } catch { /* ignore */ }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors p-3 min-h-[44px]"
      >
        <Globe className="h-8 w-8 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="text-xs uppercase font-medium text-muted-foreground">{host}</div>
          <div className="text-sm text-primary truncate">Відкрити статтю</div>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 ml-auto text-muted-foreground" />
      </a>
    );
  }

  // Get hostname for display
  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace('www.', '');
  } catch {
    hostname = preview.siteName || '';
  }

  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      {/* Image */}
      {preview.image && (
        <div className="relative overflow-hidden bg-muted">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            loading="lazy"
            className="w-full max-h-[400px] object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="p-3 space-y-1">
        {/* Site info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {preview.favicon ? (
            <img 
              src={preview.favicon} 
              alt="" 
              className="w-4 h-4 rounded-sm"
              onError={(e) => {
                // Replace with globe icon on error
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <Globe className={`w-4 h-4 ${preview.favicon ? 'hidden' : ''}`} />
          <span className="uppercase font-medium">{hostname}</span>
        </div>
        
        {/* Title */}
        {preview.title && (
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {preview.title}
          </h3>
        )}
        
        {/* Description */}
        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
