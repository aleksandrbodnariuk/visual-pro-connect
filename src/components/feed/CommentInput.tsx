import { useRef, useState } from "react";
import { Paperclip, Send, X, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImageAsFile, OUTPUT_FORMAT, OUTPUT_EXTENSION, validateImageSize } from "@/lib/imageCompression";

const HEIC_TYPES = ["image/heic", "image/heif"];

const EMOJIS = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😍","🥰","😘","😋","😛",
  "🤔","🤗","🤭","🤫","🤐","😐","😑","😶","🙄","😏","😒","😞","😔","😟","😕","🙁",
  "👍","👎","👌","✌️","🤞","🤙","👏","🙌","🤝","🙏","💪","👋","🔥","💯","⭐","✨",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💕","💖","🎉","🎊","🎁","🌹","🌸",
];

interface CommentInputProps {
  currentUser: any;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit: (text: string, imageUrl?: string) => Promise<void> | void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function CommentInput({ currentUser, placeholder = "Написати коментар...", disabled, autoFocus, onSubmit, inputRef }: CommentInputProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (HEIC_TYPES.includes(f.type) || lower.endsWith(".heic") || lower.endsWith(".heif")) {
      toast.error("Формат HEIC не підтримується. Використайте JPEG або PNG.");
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("Підтримуються лише зображення");
      return;
    }
    const v = validateImageSize(f, "post");
    if (!v.valid) {
      toast.error(v.message || "Файл занадто великий");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadImage = async (f: File): Promise<string | null> => {
    try {
      let toUpload: File = f;
      let contentType = f.type;
      if (f.type.startsWith("image/") && f.type !== "image/gif") {
        try {
          toUpload = await compressImageAsFile(f, "post");
          contentType = OUTPUT_FORMAT;
        } catch (err) {
          console.warn("Compression failed, using original", err);
        }
      }
      const ext = contentType === OUTPUT_FORMAT ? OUTPUT_EXTENSION : `.${(f.name.split(".").pop() || "jpg")}`;
      const uid = currentUser?.id;
      if (!uid) throw new Error("Не авторизовано");
      const path = `${uid}/comments/${crypto.randomUUID()}${ext}`;
      const { error } = await supabase.storage.from("posts").upload(path, toUpload, {
        contentType,
        cacheControl: "86400",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("posts").getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      console.error("Upload comment image failed:", err);
      toast.error(err?.message || "Не вдалося завантажити зображення");
      return null;
    }
  };

  const send = async () => {
    if (busy || disabled) return;
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (file) {
        const url = await uploadImage(file);
        if (!url) { setBusy(false); return; }
        imageUrl = url;
      }
      await onSubmit(trimmed, imageUrl);
      setText("");
      clearFile();
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="w-full">
      {preview && (
        <div className="mb-2 relative inline-block">
          <img src={preview} alt="Превʼю" className="h-20 w-20 object-cover rounded-lg border" />
          <button
            type="button"
            onClick={clearFile}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={currentUser?.avatar_url || currentUser?.avatarUrl || ""} />
          <AvatarFallback>
            {(currentUser?.full_name || currentUser?.firstName || "U")[0]}
          </AvatarFallback>
        </Avatar>
        <div className="relative flex-1 flex items-center bg-muted/50 rounded-full pr-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            onKeyDown={handleKey}
            placeholder={placeholder}
            autoFocus={autoFocus}
            maxLength={2000}
            disabled={busy || disabled}
            className="flex-1 h-9 bg-transparent border-0 rounded-full px-4 text-sm focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="hidden"
            onChange={pickFile}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full shrink-0"
            onClick={() => fileRef.current?.click()}
            disabled={busy || disabled}
            title="Прикріпити зображення"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full shrink-0"
                disabled={busy || disabled}
                title="Емодзі"
              >
                <Smile className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded text-xl hover:bg-muted transition-colors"
                    onClick={() => setText((prev) => (prev + e).slice(0, 2000))}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {(text.trim() || file) && (
          <Button
            type="button"
            size="icon"
            className="bg-gradient-purple rounded-full shrink-0 h-9 w-9"
            onClick={send}
            disabled={busy || disabled}
            title="Надіслати"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}