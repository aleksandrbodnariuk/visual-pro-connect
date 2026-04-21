import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Users } from "lucide-react";
import { toast } from "sonner";
import { MessagesService } from "../MessagesService";
import { compressImageAsFile, validateImageSize, OUTPUT_FORMAT, OUTPUT_EXTENSION } from "@/lib/imageCompression";
import { uploadToStorage, deleteOldFile } from "@/lib/storage";

interface Props {
  conversationId: string;
  avatarUrl?: string;
  title?: string;
  canEdit: boolean;
  onChanged: (url: string) => void;
}

export function GroupAvatarUpload({ conversationId, avatarUrl, title, canEdit, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Оберіть зображення");
      return;
    }
    // HEIC unsupported
    const lower = file.name.toLowerCase();
    if (["image/heic", "image/heif"].includes(file.type) || lower.endsWith(".heic") || lower.endsWith(".heif")) {
      toast.error("Формат HEIC не підтримується. Використайте JPEG або PNG.");
      return;
    }
    const sizeCheck = validateImageSize(file, "avatar");
    if (!sizeCheck.valid) {
      toast.error(sizeCheck.message);
      return;
    }
    setUploading(true);
    try {
      // Compress to WebP using avatar settings (default 400x400, q=0.8)
      const compressed = await compressImageAsFile(file, "avatar");
      // Delete previous group avatar (if any) to keep storage clean
      await deleteOldFile("group-avatars", avatarUrl);
      const path = `${conversationId}/${Date.now()}${OUTPUT_EXTENSION}`;
      const publicUrl = await uploadToStorage("group-avatars", path, compressed, OUTPUT_FORMAT);
      const ok = await MessagesService.updateGroupAvatar(conversationId, publicUrl);
      if (ok) onChanged(publicUrl);
    } catch (err: any) {
      toast.error(err?.message || "Не вдалося завантажити аватар");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={avatarUrl || ""} alt={title || "Група"} />
          <AvatarFallback>
            <Users className="h-8 w-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        {canEdit && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-1/2 -translate-y-1/2 -right-10 h-8 w-8 rounded-full shadow-md"
            onClick={handlePick}
            disabled={uploading}
            title="Змінити логотип"
          >
            <Camera className="h-3.5 w-3.5" />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {uploading && <span className="text-xs text-muted-foreground">Завантаження...</span>}
    </div>
  );
}