
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import App from "./App"; // Використовуємо default import
import "./index.css";
import { createStorageBuckets } from "./lib/storage";
import { supabase } from "./integrations/supabase/client";

// Ініціалізуємо сховище
const initializeStorage = async () => {
  try {
    // Перевіряємо наявність бакетів і створюємо їх якщо вони не існують
    const checkAndCreateBucket = async (bucketName: string) => {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      
      if (error && error.message.includes('не існує')) {
        await supabase.storage.createBucket(bucketName, {
          public: true
        });
        console.log(`Bucket ${bucketName} created`);
      }
    };
    
    await checkAndCreateBucket('avatars');
    await checkAndCreateBucket('portfolio');
    
    // Викликаємо створення інших бакетів
    await createStorageBuckets();
  } catch (error) {
    console.error("Error initializing storage:", error);
  }
};

initializeStorage();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
      <SonnerToaster />
    </QueryClientProvider>
  </React.StrictMode>
);
