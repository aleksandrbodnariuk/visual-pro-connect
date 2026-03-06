
/**
 * Image compression utility
 * Compresses and converts images to WebP format before uploading to storage
 */

export interface CompressionSettings {
  avatarQuality: number;  // 0-1, default 0.8
  bannerQuality: number;  // 0-1, default 0.8
  postQuality: number;    // 0-1, default 0.8
  avatarMaxWidth: number; // default 400
  avatarMaxHeight: number; // default 400
  bannerMaxWidth: number;  // default 1920
  bannerMaxHeight: number; // default 600
  postMaxWidth: number;    // default 1200
  postMaxHeight: number;   // default 1200
}

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  avatarQuality: 0.8,
  bannerQuality: 0.8,
  postQuality: 0.8,
  avatarMaxWidth: 400,
  avatarMaxHeight: 400,
  bannerMaxWidth: 1920,
  bannerMaxHeight: 600,
  postMaxWidth: 1200,
  postMaxHeight: 1200
};

/** Max upload sizes in bytes before compression */
export const MAX_UPLOAD_SIZES = {
  avatar: 2 * 1024 * 1024,   // 2MB
  banner: 5 * 1024 * 1024,   // 5MB
  post: 8 * 1024 * 1024,     // 8MB
} as const;

/** Output MIME type — always WebP */
export const OUTPUT_FORMAT = 'image/webp' as const;
export const OUTPUT_EXTENSION = '.webp' as const;

const STORAGE_KEY = 'imageCompressionSettings';

export function getCompressionSettings(): CompressionSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_COMPRESSION_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Error reading compression settings:', e);
  }
  return DEFAULT_COMPRESSION_SETTINGS;
}

export function saveCompressionSettings(settings: Partial<CompressionSettings>): void {
  try {
    const current = getCompressionSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
  } catch (e) {
    console.error('Error saving compression settings:', e);
  }
}

export type ImageType = 'avatar' | 'banner' | 'post';

/**
 * Validate file size before processing
 */
export function validateImageSize(file: File | Blob, type: ImageType): { valid: boolean; message?: string } {
  const maxSize = MAX_UPLOAD_SIZES[type];
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return { valid: false, message: `Розмір файлу не повинен перевищувати ${maxMB}MB` };
  }
  return { valid: true };
}

function getSettingsForType(type: ImageType): { maxWidth: number; maxHeight: number; quality: number } {
  const settings = getCompressionSettings();
  switch (type) {
    case 'avatar':
      return { maxWidth: settings.avatarMaxWidth, maxHeight: settings.avatarMaxHeight, quality: settings.avatarQuality };
    case 'banner':
      return { maxWidth: settings.bannerMaxWidth, maxHeight: settings.bannerMaxHeight, quality: settings.bannerQuality };
    case 'post':
    default:
      return { maxWidth: settings.postMaxWidth, maxHeight: settings.postMaxHeight, quality: settings.postQuality };
  }
}

/**
 * Convert a data URL to a Blob without using fetch
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Compress an image file using Canvas API → outputs WebP
 */
export async function compressImage(file: File, type: ImageType): Promise<Blob> {
  const { maxWidth, maxHeight, quality } = getSettingsForType(type);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) { reject(new Error('Could not get canvas context')); return; }

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`[WebP] ${type}: ${file.size} → ${blob.size} bytes (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`);
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image to WebP'));
          }
        },
        OUTPUT_FORMAT,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image and return as File object (WebP)
 */
export async function compressImageAsFile(file: File, type: ImageType): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file; // preserve animation

  try {
    const compressedBlob = await compressImage(file, type);
    const fileName = file.name.replace(/\.[^/.]+$/, OUTPUT_EXTENSION);
    return new File([compressedBlob], fileName, { type: OUTPUT_FORMAT, lastModified: Date.now() });
  } catch (error) {
    console.error('Image compression failed, using original:', error);
    return file;
  }
}

/**
 * Compress image from a data URL → returns WebP data URL
 */
export async function compressImageFromDataUrl(dataUrl: string, type: ImageType): Promise<string> {
  const { maxWidth, maxHeight, quality } = getSettingsForType(type);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) { reject(new Error('Could not get canvas context')); return; }

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL(OUTPUT_FORMAT, quality));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
