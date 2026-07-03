import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export interface PollDraft {
  question: string;
  options: string[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  /** ISO string when the poll should stop accepting votes, or null for no end */
  closesAt: string | null;
}

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: PollDraft) => Promise<void> | void;
}

export function CreatePollDialog({ open, onOpenChange, onSubmit }: CreatePollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  // Duration in hours; 0 means "no end"
  const [durationHours, setDurationHours] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setIsAnonymous(false);
    setDurationHours("0");
  };

  const updateOption = (idx: number, value: string) => {
    setOptions(prev => prev.map((o, i) => (i === idx ? value.slice(0, 200) : o)));
  };

  const addOption = () => {
    if (options.length >= 10) {
      toast.error("Максимум 10 варіантів");
      return;
    }
    setOptions(prev => [...prev, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const q = question.trim();
    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    if (!q) {
      toast.error("Введіть запитання");
      return;
    }
    if (cleanOptions.length < 2) {
      toast.error("Потрібно щонайменше 2 варіанти відповіді");
      return;
    }
    setSubmitting(true);
    try {
      const hours = Number(durationHours);
      const closesAt =
        hours > 0 ? new Date(Date.now() + hours * 3600 * 1000).toISOString() : null;
      await onSubmit({ question: q, options: cleanOptions, allowMultiple, isAnonymous, closesAt });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Створити опитування</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="poll-question">Запитання</Label>
            <Textarea
              id="poll-question"
              placeholder="Про що хочете запитати?"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label>Варіанти відповідей</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Варіант ${idx + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  maxLength={200}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(idx)}
                    className="h-9 w-9 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" /> Додати варіант
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="poll-multi" className="cursor-pointer">Кілька варіантів відповіді</Label>
            <Switch id="poll-multi" checked={allowMultiple} onCheckedChange={setAllowMultiple} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="poll-anon" className="cursor-pointer">Анонімне голосування</Label>
            <Switch id="poll-anon" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="poll-duration">Завершення опитування</Label>
            <Select value={durationHours} onValueChange={setDurationHours}>
              <SelectTrigger id="poll-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Без обмеження</SelectItem>
                <SelectItem value="1">Через 1 годину</SelectItem>
                <SelectItem value="6">Через 6 годин</SelectItem>
                <SelectItem value="24">Через 1 день</SelectItem>
                <SelectItem value="72">Через 3 дні</SelectItem>
                <SelectItem value="168">Через 7 днів</SelectItem>
                <SelectItem value="720">Через 30 днів</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Після завершення проголосувати буде неможливо. Повторне голосування заборонено.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Створення..." : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}