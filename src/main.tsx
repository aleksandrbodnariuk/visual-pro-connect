
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import App from "./App"; // Виправлено: використовуємо default import
import "./index.css";
import { createStorageBuckets } from "./lib/storage";

// Ініціалізуємо сховище
createStorageBuckets();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
        <Toaster />
        <SonnerToaster />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
