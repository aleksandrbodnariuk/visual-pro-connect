
import { supabase } from "@/integrations/supabase/client";

/**
 * Створює необхідні бакети сховища, якщо вони не існують
 */
export async function createStorageBuckets() {
  const buckets = ["avatars", "banners", "logos", "portfolio"];
  
  for (const bucketName of buckets) {
    try {
      // Перевіряємо, чи існує бакет
      const { data: existingBucket, error: bucketError } = await supabase.storage.getBucket(bucketName);
      
      // Якщо є помилка і це не 404 (бакет не існує), виводимо її
      if (bucketError && bucketError.message !== 'The resource was not found' && !bucketError.message.includes('does not exist')) {
        console.error(`Помилка перевірки бакета ${bucketName}:`, bucketError);
      }
      
      // Якщо бакет не існує, створюємо його
      if (!existingBucket || bucketError) {
        console.log(`Створюємо бакет ${bucketName}...`);
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        
        if (createError) {
          console.error(`Помилка створення бакета ${bucketName}:`, createError);
        } else {
          console.log(`Бакет ${bucketName} успішно створено`);
        }
      }
    } catch (error) {
      console.error(`Помилка роботи з бакетом ${bucketName}:`, error);
    }
  }
}

// Викликаємо функцію при завантаженні застосунку
createStorageBuckets().catch(console.error);

/**
 * Завантажує файл до Supabase Storage
 */
export async function uploadToStorage(
  bucketName: string,
  filePath: string,
  file: File,
  contentType?: string
) {
  try {
    // Забезпечуємо існування бакета
    try {
      const { data: existingBucket, error } = await supabase.storage.getBucket(bucketName);
      
      if (error) {
        console.log(`Створюємо бакет ${bucketName}...`);
        await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
      }
    } catch (bucketError) {
      console.log('Перевірка бакета:', bucketError);
      // Продовжуємо, оскільки бакет може існувати
    }
    
    // Спочатку видаляємо попередній файл, якщо він існує
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error && !error.message.includes('Object not found')) {
        console.warn(`Помилка при видаленні попереднього файлу:`, error);
      }
    } catch (removeError) {
      // Ігноруємо, файлу може не бути
      console.log('Видалення файлу (можна ігнорувати):', removeError);
    }
    
    // Завантажуємо файл
    console.log(`Завантаження ${filePath} до ${bucketName}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
        contentType,
        cacheControl: '3600',
      });
      
    if (uploadError) {
      console.error(`Помилка завантаження:`, uploadError);
      throw uploadError;
    }
    
    console.log(`Файл успішно завантажено:`, uploadData);
    
    // Отримуємо публічний URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log(`Публічний URL:`, urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Помилка завантаження до ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Видаляє файл зі сховища
 */
export async function deleteFromStorage(bucketName: string, filePath: string) {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Помилка видалення з ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Отримує публічний URL файлу
 */
export async function getPublicUrl(bucketName: string, filePath: string) {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}
