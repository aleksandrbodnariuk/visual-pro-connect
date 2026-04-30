import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Paperclip, X } from "lucide-react";

const CATEGORIES = [
  { value: "account", label: "Не можу увійти / зареєструватися" },
  { value: "bug", label: "Помилка / Баг" },
  { value: "general", label: "Загальне питання" },
  { value: "feature", label: "Пропозиція" },
];

interface GuestSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestSupportDialog({ open, onOpenChange }: GuestSupportDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("account");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

  const reset = () => {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setCategory("account");
    clearFile();
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail || !trimmedSubject || !trimmedMessage) {
      toast.error("Заповніть email, тему та повідомлення");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast.error("Вкажіть коректний email");
      return;
    }
    if (trimmedSubject.length > 200) {
      toast.error("Тема не може бути довшою за 200 символів");
      return;
    }
    if (trimmedMessage.length > 2000) {
      toast.error("Повідомлення не може бути довшим за 2000 символів");
      return;
    }

    setLoading(true);
    try {
      let attachment_url: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() || "png";
        const path = `guest/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
        user_id: null,
        guest_email: trimmedEmail,
        guest_name: name.trim() || null,
        subject: trimmedSubject,
        message: trimmedMessage,
        category,
        attachment_url,
      } as any);

      if (error) throw error;

      toast.success("Звернення відправлено! Ми відповімо на вказаний email.");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Не вдалося відправити звернення");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Написати в підтримку</DialogTitle>
          <DialogDescription>
            Не можете увійти або зареєструватися? Опишіть проблему — ми відповімо на ваш email.
          </DialogDescription>
        </DialogHeader>

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
            <Label>Ваше ім'я (необов'язково)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Як до вас звертатися"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Email для відповіді *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              maxLength={254}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Тема *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Коротко опишіть проблему"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Повідомлення *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Детально опишіть вашу проблему..."
              rows={5}
              maxLength={2000}
              required
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
      </DialogContent>
    </Dialog>
  );
}
