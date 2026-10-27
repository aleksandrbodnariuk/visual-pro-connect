/**
 * Portfolio media pipeline — generates multiple variants for an image:
 * - preview (≤400px, lower quality, for grid)
 * - display (≤1600px, high quality, for lightbox)
 *
 * Both are uploaded as WebP. Returns the resulting URLs.
 *
 * For non-images (audio/video), returns null variants so the caller
 * uses the original media_url only.
 */
import { supabase } from '@/integrations/supabase/client';
import { uploadToStorage } from '@/lib/storage';

const PREVIEW_MAX = 400;
const PREVIEW_QUALITY = 0.72;
const DISPLAY_MAX = 1600;
const DISPLAY_QUALITY = 0.85;

const OUTPUT_FORMAT = 'image/webp' as const;
const OUTPUT_EXTENSION = '.webp' as const;

/** Fallback MIME types by extension — some OS/browsers report an empty file.type */
const EXT_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/x-m4a',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/** Resolve a reliable MIME type for a File, falling back to its extension. */
export function resolveUploadMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return EXT_MIME[ext] || 'application/octet-stream';
}

export interface PortfolioMediaVariants {
  /** Lightweight preview for grids (≤400px WebP) */
  previewUrl: string | null;
  /** High-quality display image for lightbox (≤1600px WebP) */
  displayUrl: string | null;
  /** Original/source URL — what gets stored in legacy media_url */
  originalUrl: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const bstr = atob(parts[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/**
 * Resize + transcode an image to WebP at the requested max dimension.
 * Returns a Blob (WebP). Throws on canvas error.
 */
async function renderVariant(
  sourceDataUrl: string,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context unavailable'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        OUTPUT_FORMAT,
        quality,
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = sourceDataUrl;
  });
}

/**
 * Build & upload preview + display variants for an image File.
 * For non-images returns null variants — caller should fall back to original.
 *
 * Storage layout (matches RLS — user folder prefix):
 *   portfolio/{userId}/{ts}-{rand}-preview.webp
 *   portfolio/{userId}/{ts}-{rand}-display.webp
 *   portfolio/{userId}/{ts}-{rand}-original.{ext}  (for non-images this is the only file)
 */
export async function uploadPortfolioImageVariants(
  file: File,
  userId: string,
  bucket: string = 'portfolio',
): Promise<PortfolioMediaVariants> {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const baseKey = `${userId}/${ts}-${rand}`;
  const mime = resolveUploadMime(file);

  // Non-image: upload as-is, no variants
  if (!mime.startsWith('image/')) {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${baseKey}-original.${ext}`;
    const url = await uploadToStorage(bucket, path, file, mime);
    return { previewUrl: null, displayUrl: null, originalUrl: url };
  }

  // GIF: keep original (animation), skip variants
  if (mime === 'image/gif') {
    const path = `${baseKey}-original.gif`;
    const url = await uploadToStorage(bucket, path, file, mime);
    return { previewUrl: null, displayUrl: null, originalUrl: url };
  }

  // Image pipeline: generate two variants
  const sourceDataUrl = await readFileAsDataUrl(file);

  const [previewBlob, displayBlob] = await Promise.all([
    renderVariant(sourceDataUrl, PREVIEW_MAX, PREVIEW_QUALITY),
    renderVariant(sourceDataUrl, DISPLAY_MAX, DISPLAY_QUALITY),
  ]);

  const previewFile = new File([previewBlob], `preview${OUTPUT_EXTENSION}`, {
    type: OUTPUT_FORMAT,
    lastModified: ts,
  });
  const displayFile = new File([displayBlob], `display${OUTPUT_EXTENSION}`, {
    type: OUTPUT_FORMAT,
    lastModified: ts,
  });

  const [previewUrl, displayUrl] = await Promise.all([
    uploadToStorage(bucket, `${baseKey}-preview${OUTPUT_EXTENSION}`, previewFile, OUTPUT_FORMAT),
    uploadToStorage(bucket, `${baseKey}-display${OUTPUT_EXTENSION}`, displayFile, OUTPUT_FORMAT),
  ]);

  console.log(
    `[portfolio pipeline] orig=${(file.size / 1024).toFixed(0)}KB → preview=${(previewBlob.size / 1024).toFixed(0)}KB / display=${(displayBlob.size / 1024).toFixed(0)}KB`,
  );

  // We treat the high-quality display variant as the canonical "media_url" too,
  // so legacy code that only reads media_url still gets a good image.
  return {
    previewUrl,
    displayUrl,
    originalUrl: displayUrl,
  };
}

/**
 * Best-effort cleanup of all variant files for a portfolio item.
 * Accepts URLs to remove from the portfolio bucket.
 */
export async function deletePortfolioVariants(urls: (string | null | undefined)[]): Promise<void> {
  const buckets = new Map<string, Set<string>>();
  for (const url of urls) {
    if (!url) continue;
    const m = url.match(/\/storage\/v1\/object\/public\/(portfolio|posts)\/(.+)$/);
    if (!m) continue;
    const paths = buckets.get(m[1]) || new Set<string>();
    paths.add(decodeURIComponent(m[2].split(/[?#]/)[0]));
    buckets.set(m[1], paths);
  }
  await Promise.all(Array.from(buckets, async ([bucket, paths]) => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([...paths]);
      if (error) console.warn('[portfolio pipeline] cleanup failed:', error);
    } catch (e) { console.warn('[portfolio pipeline] cleanup failed:', e); }
  }));
}

export async function uploadPortfolioCover(file: File, userId: string) {
  if (!resolveUploadMime(file).startsWith('image/')) throw new Error('Оберіть зображення для обкладинки');
  if (file.size > 50 * 1024 * 1024) throw new Error('Обкладинка має бути не більшою за 50 МБ');
  return uploadPortfolioImageVariants(file, userId);
}
