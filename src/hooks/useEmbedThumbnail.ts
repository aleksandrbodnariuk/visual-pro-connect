import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VideoEmbed } from "@/lib/videoEmbed";

const memoryCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function readCache(url: string): string | null | undefined {
  if (memoryCache.has(url)) return memoryCache.get(url);
  try {
    const raw = sessionStorage.getItem(`embed-thumb:${url}`);
    if (raw !== null) {
      const value = raw === "" ? null : raw;
      memoryCache.set(url, value);
      return value;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function writeCache(url: string, value: string | null) {
  memoryCache.set(url, value);
  try {
    sessionStorage.setItem(`embed-thumb:${url}`, value ?? "");
  } catch {
    /* ignore */
  }
}

async function fetchThumbnail(url: string): Promise<string | null> {
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-link-preview", {
        body: { url },
      });
      const image = !error && data?.success ? (data.data?.image ?? null) : null;
      writeCache(url, image);
      return image;
    } catch {
      writeCache(url, null);
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  return promise;
}

/**
 * Повертає прев'ю-зображення для відео-ембеду.
 * YouTube має готовий thumbnailUrl, для Facebook/Instagram/TikTok
 * тягнемо og:image через edge-функцію fetch-link-preview.
 */
export function useEmbedThumbnail(embed?: VideoEmbed | null): string | null {
  const directThumb = embed?.thumbnailUrl ?? null;
  const url = embed?.originalUrl ?? null;
  const shouldFetch = !!url && !directThumb && !!embed && embed.platform !== "link";

  const [thumbnail, setThumbnail] = useState<string | null>(
    directThumb ?? (url && shouldFetch ? readCache(url) ?? null : null)
  );

  useEffect(() => {
    if (directThumb) {
      setThumbnail(directThumb);
      return;
    }
    if (!shouldFetch || !url) {
      setThumbnail(null);
      return;
    }

    const cached = readCache(url);
    if (cached !== undefined) {
      setThumbnail(cached);
      return;
    }

    let mounted = true;
    fetchThumbnail(url).then((image) => {
      if (mounted) setThumbnail(image);
    });
    return () => {
      mounted = false;
    };
  }, [directThumb, shouldFetch, url]);

  return thumbnail;
}
