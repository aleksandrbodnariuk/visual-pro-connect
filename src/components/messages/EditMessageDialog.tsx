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
    if (trimmedText && trimmedText !== messageText) {
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
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Редагувати повідомлення</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px] resize-none"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            {text.length} / 2000 символів
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!text.trim() || text.length > 2000}
          >
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
