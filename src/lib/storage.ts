
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
    }
  }
}

// Call this function when the app starts
createStorageBuckets();
