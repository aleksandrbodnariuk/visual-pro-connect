
import { MoreHorizontal, Edit, Trash2, Flag, Link, Share2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PostMenuProps {
  postId: string;
  isAuthor: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export function PostMenu({ postId, isAuthor, onEdit, onDelete }: PostMenuProps) {
  const handleEdit = () => {
    if (onEdit) {
      onEdit(postId);
    } else {
      toast.info("Редагування публікації");
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(postId);
    } else {
      toast.success("Публікацію видалено");
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
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
        url: `${window.location.origin}/post/${postId}`
      })
      .then(() => console.log('Shared successfully'))
      .catch((error) => console.error('Share error:', error));
    } else {
      handleCopyLink(); // Fallback to copying link if Web Share API not available
    }
  };

  return (
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
              onClick={handleDelete}
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyLink} className="flex items-center cursor-pointer">
          <Link className="mr-2 h-4 w-4" />
          Копіювати посилання
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} className="flex items-center cursor-pointer">
          <Share2 className="mr-2 h-4 w-4" />
          Поділитися
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
