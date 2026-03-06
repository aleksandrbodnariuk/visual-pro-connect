
import { supabase } from '@/integrations/supabase/client';

/**
 * Extract the storage file path from a Supabase public URL
 * Returns null if URL doesn't match expected pattern
 */
export function extractStoragePath(publicUrl: string, bucketName: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    const path = publicUrl.substring(idx + marker.length).split('?')[0];
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Delete old file from storage bucket by its public URL
 */
export async function deleteOldFile(bucketName: string, publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  const filePath = extractStoragePath(publicUrl, bucketName);
  if (!filePath) return;
  
  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    if (error) {
      console.warn(`Не вдалося видалити старий файл з ${bucketName}:`, error.message);
    } else {
      console.log(`Старий файл видалено з ${bucketName}:`, filePath);
    }
  } catch (e) {
    console.warn('Помилка видалення старого файлу:', e);
  }
}

export async function uploadToStorage(
  bucketName: string,
  filePath: string,
  file: File,
  contentType: string
): Promise<string> {
  try {
    console.log(`Спроба завантаження файлу в bucket: ${bucketName}, шлях: ${filePath}`);
    console.log(`Розмір файлу: ${file.size} байт, тип: ${contentType}`);
    
    // Завантажуємо файл з upsert для заміни існуючого
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
        contentType: contentType,
        cacheControl: '86400'
      });
    
    if (uploadError) {
      console.error(`Помилка завантаження файлу в ${bucketName}:`, uploadError);
      throw new Error(`Помилка завантаження файлу: ${uploadError.message}`);
    }
    
    console.log(`Файл успішно завантажено в ${bucketName}:`, uploadData);
    
    // Отримуємо публічний URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    const publicUrl = urlData.publicUrl;
    console.log(`Публічний URL файлу: ${publicUrl}`);
    
    if (!publicUrl) {
      throw new Error('Не вдалося отримати публічний URL');
    }
    
    return publicUrl;
  } catch (error) {
    console.error('Помилка в uploadToStorage:', error);
    throw error;
  }
}
