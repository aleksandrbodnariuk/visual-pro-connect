
/**
 * Image compression utility
 * Compresses images on the client side before uploading to storage
 */

export interface CompressionSettings {
  avatarQuality: number;  // 0-1, default 0.8
  bannerQuality: number;  // 0-1, default 0.75
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
  bannerQuality: 0.75,
  postQuality: 0.8,
  avatarMaxWidth: 400,
  avatarMaxHeight: 400,
  bannerMaxWidth: 1920,
  bannerMaxHeight: 600,
  postMaxWidth: 1200,
  postMaxHeight: 1200
};

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
 * Compress an image file using Canvas API
 * @param file - Original image file
 * @param type - Type of image (avatar, banner, post)
 * @returns Compressed image as Blob
 */
export async function compressImage(
  file: File,
  type: ImageType
): Promise<Blob> {
  const settings = getCompressionSettings();
  
  let maxWidth: number;
  let maxHeight: number;
  let quality: number;
  
  switch (type) {
    case 'avatar':
      maxWidth = settings.avatarMaxWidth;
      maxHeight = settings.avatarMaxHeight;
      quality = settings.avatarQuality;
      break;
    case 'banner':
      maxWidth = settings.bannerMaxWidth;
      maxHeight = settings.bannerMaxHeight;
      quality = settings.bannerQuality;
      break;
    case 'post':
    default:
      maxWidth = settings.postMaxWidth;
      maxHeight = settings.postMaxHeight;
      quality = settings.postQuality;
      break;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image with smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`Compressed ${type}: ${file.size} -> ${blob.size} bytes (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`);
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image and return as File object
 */
export async function compressImageAsFile(
  file: File,
  type: ImageType
): Promise<File> {
  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for GIFs to preserve animation
  if (file.type === 'image/gif') {
    return file;
  }

  try {
    const compressedBlob = await compressImage(file, type);
    
    // Create new file from blob
    const fileName = file.name.replace(/\.[^/.]+$/, '.jpg');
    return new File([compressedBlob], fileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } catch (error) {
    console.error('Image compression failed, using original:', error);
    return file;
  }
}

/**
 * Compress image from a data URL
 */
/**
 * Convert a data URL to a Blob without using fetch (more reliable)
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

export async function compressImageFromDataUrl(
  dataUrl: string,
  type: ImageType
): Promise<string> {
  const settings = getCompressionSettings();
  
  let maxWidth: number;
  let maxHeight: number;
  let quality: number;
  
  switch (type) {
    case 'avatar':
      maxWidth = settings.avatarMaxWidth;
      maxHeight = settings.avatarMaxHeight;
      quality = settings.avatarQuality;
      break;
    case 'banner':
      maxWidth = settings.bannerMaxWidth;
      maxHeight = settings.bannerMaxHeight;
      quality = settings.bannerQuality;
      break;
    case 'post':
    default:
      maxWidth = settings.postMaxWidth;
      maxHeight = settings.postMaxHeight;
      quality = settings.postQuality;
      break;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

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

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}
