import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Send } from "lucide-react";

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
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        category,
      } as any);

      if (error) throw error;

      toast.success("Звернення відправлено! Ми відповімо найближчим часом.");
      setSubject("");
      setMessage("");
      setCategory("general");
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

      <Button type="submit" disabled={loading} className="w-full">
        <Send className="w-4 h-4 mr-2" />
        {loading ? "Відправка..." : "Відправити"}
      </Button>
    </form>
  );
}
