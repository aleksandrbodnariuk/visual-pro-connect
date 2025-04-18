
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import App from "./App"; // Використовуємо default import
import "./index.css";
import { createStorageBuckets } from "./lib/storage";

// Ініціалізуємо сховище
createStorageBuckets();

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
