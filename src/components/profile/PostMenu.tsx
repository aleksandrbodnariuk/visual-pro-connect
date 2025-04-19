
import { MoreHorizontal, Edit, Trash2, Flag, Link } from "lucide-react";
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
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success("Посилання скопійовано");
  };

  const handleReport = () => {
    toast.info("Скаргу надіслано");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Додаткові опції</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAuthor ? (
          <>
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Редагувати публікацію
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Видалити публікацію
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={handleReport}>
            <Flag className="mr-2 h-4 w-4" />
            Поскаржитись
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link className="mr-2 h-4 w-4" />
          Копіювати посилання
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
