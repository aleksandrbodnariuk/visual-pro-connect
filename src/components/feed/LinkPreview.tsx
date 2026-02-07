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
    const fetchPreview = async () => {
      setLoading(true);
      setError(false);
      
      try {
        const { data, error: fetchError } = await supabase.functions.invoke('fetch-link-preview', {
          body: { url }
        });

        if (fetchError || !data?.success) {
          console.error('Error fetching link preview:', fetchError || data?.error);
          setError(true);
          return;
        }

        setPreview(data.data);
      } catch (err) {
        console.error('Error fetching link preview:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
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

  // Error or no preview - show simple link
  if (error || !preview) {
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-primary hover:underline text-sm break-all"
      >
        <ExternalLink className="h-4 w-4 shrink-0" />
        {url}
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
        <div className="relative aspect-[1.91/1] overflow-hidden bg-muted">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Hide broken images
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
