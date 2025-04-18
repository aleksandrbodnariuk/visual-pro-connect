
import { supabase } from "@/integrations/supabase/client";

export async function createStorageBuckets() {
  const buckets = ["avatars", "portfolio"];
  
  for (const bucketName of buckets) {
    const { data: existingBucket } = await supabase.storage.getBucket(bucketName);
    
    if (!existingBucket) {
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    }
  }
}
