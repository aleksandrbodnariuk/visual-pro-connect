import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageText: string;
  onSave: (newText: string) => void;
}

export function EditMessageDialog({ 
  open, 
  onOpenChange, 
  messageText, 
  onSave 
}: EditMessageDialogProps) {
  const [text, setText] = useState(messageText);

  useEffect(() => {
    if (open) {
      setText(messageText);
    }
  }, [open, messageText]);

  const handleSave = () => {
    const trimmedText = text.trim();
    // Дозволяємо зберігати пустий текст, якщо є вкладення
    if (trimmedText !== messageText) {
      onSave(trimmedText);
    } else {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white text-black" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-black">Редагувати повідомлення</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px] resize-none bg-gray-50 border-gray-300 text-black"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            {text.length} / 2000 символів
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button 
            onClick={handleSave}
            disabled={text.length > 2000}
          >
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
