import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessageInputProps {
  onSendMessage: (text: string, attachmentUrl?: string, attachmentType?: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Перевірка розміру (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл занадто великий. Максимум 5MB");
      return;
    }

    // Перевірка типу файлу
    if (!file.type.startsWith('image/')) {
      toast.error("Підтримуються лише зображення");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Помилка завантаження файлу:", error);
      toast.error("Не вдалося завантажити файл");
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;

    setIsUploading(true);
    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;

    try {
      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile) || undefined;
        attachmentType = 'image';
        if (!attachmentUrl) {
          setIsUploading(false);
          return;
        }
      }

      onSendMessage(messageText, attachmentUrl, attachmentType);
      setMessageText("");
      clearFile();
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isUploading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };

  return (
    <div className="border-t p-3">
      {/* Превʼю вибраного файлу */}
      {previewUrl && (
        <div className="mb-2 relative inline-block">
          <img 
            src={previewUrl} 
            alt="Превʼю" 
            className="h-20 w-20 object-cover rounded-lg border"
          />
          <button
            onClick={clearFile}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {/* Кнопка вкладення */}
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileSelect}
        />

        <Textarea
          placeholder="Напишіть повідомлення..."
          className="flex-1 min-h-[40px] max-h-[120px] md:min-h-[40px] md:max-h-[40px] resize-none"
          rows={isMobile ? 3 : 1}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value.slice(0, 5000))}
          maxLength={5000}
          onKeyDown={handleKeyPress}
          disabled={isUploading}
        />

        {/* Емодзі */}
        <EmojiPicker onSelectEmoji={handleEmojiSelect} />

        <Button 
          className="bg-gradient-purple rounded-full" 
          size="icon"
          onClick={handleSendMessage}
          disabled={isUploading || (!messageText.trim() && !selectedFile)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
