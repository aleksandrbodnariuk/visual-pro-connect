import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Send, Paperclip, X, ImageIcon } from "lucide-react";

const CATEGORIES = [
  { value: "general", label: "Загальне питання" },
  { value: "bug", label: "Помилка / Баг" },
  { value: "feature", label: "Пропозиція" },
  { value: "account", label: "Мій акаунт" },
];

interface SupportFormProps {
  onCreated: () => void;
}

export function SupportForm({ onCreated }: SupportFormProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Можна прикріпити лише зображення");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("Файл занадто великий (макс. 5 МБ)");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Заповніть всі поля");
      return;
    }
    if (subject.length > 200) {
      toast.error("Тема не може бути довшою за 200 символів");
      return;
    }
    if (message.length > 2000) {
      toast.error("Повідомлення не може бути довшим за 2000 символів");
      return;
    }

    setLoading(true);
    try {
      let attachment_url: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("support-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("support-attachments")
          .getPublicUrl(path);
        attachment_url = pub.publicUrl;
      }

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        category,
        attachment_url,
      } as any);

      if (error) throw error;

      toast.success("Звернення відправлено! Ми відповімо найближчим часом.");
      setSubject("");
      setMessage("");
      setCategory("general");
      clearFile();
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося відправити звернення");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Категорія</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Тема</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Коротко опишіть проблему"
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label>Повідомлення</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Детально опишіть вашу проблему або питання..."
          rows={5}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
      </div>

      <div className="space-y-2">
        <Label>Скриншот (необов'язково)</Label>
        {previewUrl ? (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Прикріплення"
              className="max-h-40 rounded-md border border-border object-contain"
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={clearFile}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 hover:bg-muted/50 transition-colors w-fit">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Прикріпити зображення (до 5 МБ)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        <Send className="w-4 h-4 mr-2" />
        {loading ? "Відправка..." : "Відправити"}
      </Button>
    </form>
  );
}
