
import { useState } from "react";
import { MoreHorizontal, Edit, Trash2, Flag, Link, Share2, ExternalLink, RectangleVertical, RectangleHorizontal } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getPostShareUrl } from "@/lib/postShare";
import { extractVideoEmbed } from "@/lib/videoEmbed";
import { supabase } from "@/integrations/supabase/client";

interface PostMenuProps {
  postId: string;
  isAuthor: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  caption?: string; // Для витягування URL з тексту
  videoOrientation?: "vertical" | "horizontal" | null;
}

// Функція для витягування URL з тексту
const extractUrl = (text?: string): string | null => {
  if (!text) return null;
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
};

export function PostMenu({ postId, isAuthor, onEdit, onDelete, caption, videoOrientation }: PostMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState<"vertical" | "horizontal" | null>(
    videoOrientation ?? null,
  );
  const [orientationSaving, setOrientationSaving] = useState(false);
  
  const mediaUrl = extractUrl(caption);
  const hasVideoEmbed = !!extractVideoEmbed(caption || "");

  const setOrientation = async (orientation: "vertical" | "horizontal") => {
    if (orientationSaving) return;
    setOrientationSaving(true);
    const prev = currentOrientation;
    setCurrentOrientation(orientation);
    const { error } = await supabase
      .from("posts")
      .update({ video_orientation: orientation } as any)
      .eq("id", postId);
    setOrientationSaving(false);
    if (error) {
      setCurrentOrientation(prev);
      console.error("Update video_orientation error:", error);
      toast.error("Не вдалося змінити формат відео");
      return;
    }
    toast.success(
      orientation === "vertical"
        ? "Формат відео: вертикальний"
        : "Формат відео: горизонтальний",
    );
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(postId);
    } else {
      toast.info("Редагування публікації");
    }
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(postId);
    }
    setShowDeleteDialog(false);
  };

  const shareUrl = getPostShareUrl(postId);

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Посилання скопійовано");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Помилка при копіюванні посилання");
    }
  };

  const handleReport = () => {
    toast.info("Скаргу надіслано");
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Поділитися публікацією',
        url: shareUrl
      })
      .then(() => console.log('Shared successfully'))
      .catch((error) => console.error('Share error:', error));
    } else {
      handleCopyLink();
    }
  };

  const handleCopyMediaLink = () => {
    if (mediaUrl) {
      try {
        navigator.clipboard.writeText(mediaUrl);
        toast.success("Посилання на медіа скопійовано");
      } catch (error) {
        console.error("Copy media link error:", error);
        toast.error("Помилка при копіюванні");
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Додаткові опції</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isAuthor ? (
            <>
              <DropdownMenuItem onClick={handleEdit} className="flex items-center cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                Редагувати публікацію
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive flex items-center cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Видалити публікацію
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleReport} className="flex items-center cursor-pointer">
              <Flag className="mr-2 h-4 w-4" />
              Поскаржитись
            </DropdownMenuItem>
          )}
          {isAuthor && hasVideoEmbed && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setOrientation("vertical")}
                disabled={orientationSaving}
                className="flex items-center cursor-pointer"
              >
                <RectangleVertical className="mr-2 h-4 w-4" />
                Вертикальне відео
                {currentOrientation === "vertical" && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setOrientation("horizontal")}
                disabled={orientationSaving}
                className="flex items-center cursor-pointer"
              >
                <RectangleHorizontal className="mr-2 h-4 w-4" />
                Горизонтальне відео
                {currentOrientation === "horizontal" && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyLink} className="flex items-center cursor-pointer">
            <Link className="mr-2 h-4 w-4" />
            Копіювати посилання
          </DropdownMenuItem>
          {mediaUrl && (
            <DropdownMenuItem onClick={handleCopyMediaLink} className="flex items-center cursor-pointer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Копіювати посилання на медіа
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleShare} className="flex items-center cursor-pointer">
            <Share2 className="mr-2 h-4 w-4" />
            Поділитися
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити публікацію?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Публікацію буде видалено назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
