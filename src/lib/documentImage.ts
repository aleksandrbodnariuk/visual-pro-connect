/**
 * Стиснення зображень для символіки (друк) і фото протоколів (юридичні документи).
 * SVG і малі файли не змінюються; якщо стиснення не зменшує файл — повертається оригінал.
 */
export type QualityProfile = 'symbol' | 'document';

export const PROFILES: Record<QualityProfile, { maxSide: number; quality: number; skipBelow: number }> = {
  // 2560px ≈ А4 при 300 DPI по короткій стороні — достатньо для друку логотипа/прапора
  symbol: { maxSide: 2560, quality: 0.9, skipBelow: 400 * 1024 },
  // 3508px = довга сторона А4 при 300 DPI — читабельні рукописні цифри й печатки
  document: { maxSide: 3508, quality: 0.92, skipBelow: 700 * 1024 },
};

export function targetSize(w: number, h: number, maxSide: number) {
  const longest = Math.max(w, h);
  if (longest <= maxSide) return { width: w, height: h };
  const r = maxSide / longest;
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

export async function compressForProfile(file: File, profile: QualityProfile): Promise<File> {
  const p = PROFILES[profile];
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  try {
    // createImageBitmap застосовує EXIF-орієнтацію — фото не буде боком
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const { width, height } = targetSize(bmp.width, bmp.height, p.maxSide);
    if (width === bmp.width && file.size < p.skipBelow) { bmp.close(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, width, height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', p.quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  }
}
