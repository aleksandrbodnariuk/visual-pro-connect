
import { supabase } from "@/integrations/supabase/client";

export async function createStorageBuckets() {
  const buckets = ["avatars", "banners", "logos", "portfolio"];
  
  for (const bucketName of buckets) {
    try {
      const { data: existingBucket } = await supabase.storage.getBucket(bucketName);
      
      if (!existingBucket) {
        await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        console.log(`Created bucket: ${bucketName}`);
      }
    } catch (error) {
      console.error(`Error checking/creating bucket ${bucketName}:`, error);
      // Continue with other operations as this is initialization
    }
  }
}

// Call this function when the app starts
createStorageBuckets().catch(console.error);

export async function uploadToStorage(
  bucketName: string,
  filePath: string,
  file: File,
  contentType?: string
) {
  try {
    // Ensure bucket exists
    try {
      const { data: existingBucket } = await supabase.storage.getBucket(bucketName);
      
      if (!existingBucket) {
        await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
      }
    } catch (bucketError) {
      console.log('Error checking bucket:', bucketError);
      // Continue anyway since the bucket might exist already
    }
    
    // Try to remove existing file first
    try {
      await supabase.storage
        .from(bucketName)
        .remove([filePath]);
    } catch (removeError) {
      // Ignore, file might not exist
      console.log('Removing file (can be ignored if not exists):', removeError);
    }
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
        contentType,
      });
      
    if (error) throw error;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading to ${bucketName}:`, error);
    throw error;
  }
}

export async function deleteFromStorage(bucketName: string, filePath: string) {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting from ${bucketName}:`, error);
    throw error;
  }
}

export async function getPublicUrl(bucketName: string, filePath: string) {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}
