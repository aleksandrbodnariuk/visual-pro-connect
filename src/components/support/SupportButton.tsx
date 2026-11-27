import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupportDialog } from "./SupportDialog";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  if (!isAuthenticated) return null;
  // На сторінках чатів кнопка перекривала «Відправити» — там її ховаємо
  const hideFab = pathname.startsWith("/messages") || pathname.startsWith("/chat");

  return (
    <>
      {!hideFab && <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-3 z-40 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        aria-label="Підтримка"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </Button>}
      <SupportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
