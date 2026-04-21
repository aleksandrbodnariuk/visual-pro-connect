import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessagesService } from "../MessagesService";

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
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Розмір не більше 5 МБ");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${conversationId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("group-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("group-avatars").getPublicUrl(path);
      const ok = await MessagesService.updateGroupAvatar(conversationId, pub.publicUrl);
      if (ok) onChanged(pub.publicUrl);
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
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
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