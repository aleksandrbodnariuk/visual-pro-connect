import { useState, useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirmDelete: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userName,
  onConfirmDelete,
}: DeleteUserDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setCountdown(10);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open]);

  // Countdown logic after confirmation
  useEffect(() => {
    if (!confirmed) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onConfirmDelete();
          onOpenChange(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [confirmed, onConfirmDelete, onOpenChange]);

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setConfirmed(false);
    setCountdown(10);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmed ? "Видалення користувача..." : "Підтвердження видалення"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {confirmed ? (
                <div className="space-y-3">
                  <p>
                    Користувача <strong>{userName}</strong> буде видалено через{" "}
                    <strong>{countdown}</strong> сек. Натисніть «Скасувати» щоб відмінити.
                  </p>
                  <Progress value={((10 - countdown) / 10) * 100} className="h-2" />
                </div>
              ) : (
                <p>
                  Ви намагаєтесь видалити користувача{" "}
                  <strong>{userName}</strong>. Підтвердьте видалення або скасуйте
                  команду.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Скасувати</AlertDialogCancel>
          {!confirmed && (
            <Button
              variant="destructive"
              onClick={() => setConfirmed(true)}
            >
              Підтвердити видалення
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
