import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupportDialog } from "./SupportDialog";
import { useAuth } from "@/context/AuthContext";

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-20 sm:bottom-6 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        aria-label="Підтримка"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </Button>
      <SupportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
