import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EditMessageDialog } from "./EditMessageDialog";
import { DeleteMessageDialog } from "./DeleteMessageDialog";

interface MessageActionsProps {
  messageId: string;
  messageText: string;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string) => void;
}

export function MessageActions({ messageId, messageText, onEdit, onDelete }: MessageActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Редагувати
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Видалити
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditMessageDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        messageText={messageText}
        onSave={(newText) => {
          onEdit(messageId, newText);
          setShowEditDialog(false);
        }}
      />

      <DeleteMessageDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          onDelete(messageId);
          setShowDeleteDialog(false);
        }}
      />
    </>
  );
}
