
import { supabase } from '@/integrations/supabase/client';

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
        cacheControl: '3600'
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
