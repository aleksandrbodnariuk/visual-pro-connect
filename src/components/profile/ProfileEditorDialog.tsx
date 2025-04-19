
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProfileEditor } from "./ProfileEditor";
import { useState } from "react";

interface ProfileEditorDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ProfileEditorDialog({ user, open, onOpenChange, onUpdate }: ProfileEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Редагування профілю</DialogTitle>
          <DialogDescription>
            Оновіть інформацію про себе та налаштуйте свій профіль
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {user && <ProfileEditor user={user} onUpdate={() => {
            if (onUpdate) onUpdate();
            onOpenChange(false);
          }} />}
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрити
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
