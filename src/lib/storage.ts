
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates necessary storage buckets if they don't exist
 */
export async function createStorageBuckets() {
  const buckets = ["avatars", "banners", "logos", "portfolio"];
  
  for (const bucketName of buckets) {
    try {
      console.log(`Перевіряємо бакет ${bucketName}...`);
      
      // Check if the bucket exists
      const { data: existingBucket, error: bucketError } = await supabase.storage.getBucket(bucketName);
      
      // If there's an error and it's not a 404 (bucket doesn't exist), log it
      if (bucketError && !bucketError.message.includes('does not exist')) {
        console.error(`Помилка перевірки бакета ${bucketName}:`, bucketError);
      }
      
      // If the bucket doesn't exist, create it
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
      } else {
        console.log(`Бакет ${bucketName} вже існує`);
      }
    } catch (error) {
      console.error(`Помилка роботи з бакетом ${bucketName}:`, error);
    }
  }
}

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadToStorage(
  bucketName: string,
  filePath: string,
  file: File,
  contentType?: string
): Promise<string> {
  try {
    // Ensure the bucket exists
    await createStorageBuckets();
    
    console.log(`Завантаження ${filePath} до ${bucketName}...`);
    
    // First try to delete any existing file with the same path
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error && !error.message.includes('Object not found')) {
        console.warn(`Помилка при видаленні попереднього файлу:`, error);
      }
    } catch (removeError) {
      // Ignore, file might not exist
      console.log('Видалення попереднього файлу (можна ігнорувати):', removeError);
    }
    
    // Upload the file
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
    
    // Get the public URL
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
 * Deletes a file from storage
 */
export async function deleteFromStorage(bucketName: string, filePath: string): Promise<boolean> {
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
 * Gets the public URL of a file
 */
export async function getPublicUrl(bucketName: string, filePath: string): Promise<string> {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}

// Call this function when the app loads to create necessary buckets
createStorageBuckets().catch(console.error);
