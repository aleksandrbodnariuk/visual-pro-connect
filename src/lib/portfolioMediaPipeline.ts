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
): Promise<PortfolioMediaVariants> {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const baseKey = `${userId}/${ts}-${rand}`;

  // Non-image: upload as-is, no variants
  if (!file.type.startsWith('image/')) {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${baseKey}-original.${ext}`;
    const url = await uploadToStorage('portfolio', path, file, file.type);
    return { previewUrl: null, displayUrl: null, originalUrl: url };
  }

  // GIF: keep original (animation), skip variants
  if (file.type === 'image/gif') {
    const path = `${baseKey}-original.gif`;
    const url = await uploadToStorage('portfolio', path, file, file.type);
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
    uploadToStorage('portfolio', `${baseKey}-preview${OUTPUT_EXTENSION}`, previewFile, OUTPUT_FORMAT),
    uploadToStorage('portfolio', `${baseKey}-display${OUTPUT_EXTENSION}`, displayFile, OUTPUT_FORMAT),
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
  const paths: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    const m = url.match(/\/storage\/v1\/object\/public\/portfolio\/(.+)$/);
    if (m) paths.push(decodeURIComponent(m[1].split(/[?#]/)[0]));
  }
  if (paths.length === 0) return;
  try {
    await supabase.storage.from('portfolio').remove(paths);
  } catch (e) {
    console.warn('[portfolio pipeline] cleanup failed:', e);
  }
}
