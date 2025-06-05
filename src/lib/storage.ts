
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
    
    // Перевіряємо, чи існує bucket
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Помилка отримання списку buckets:', listError);
      // Якщо не можемо отримати список, спробуємо створити bucket
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Створюю bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/*', 'video/*']
      });
      
      if (createError) {
        console.error(`Помилка створення bucket ${bucketName}:`, createError);
        // Продовжуємо, можливо bucket вже існує
      } else {
        console.log(`Bucket ${bucketName} успішно створено`);
      }
    }
    
    // Завантажуємо файл
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
