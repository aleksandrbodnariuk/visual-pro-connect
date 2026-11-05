import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAssistantSettings, AssistantSettings } from "@/hooks/useAssistantSettings";

const db = supabase as any;
const STATUSES = [
  ["unread", "Не прочитані"], ["read", "Прочитані"], ["in_progress", "В роботі"], ["archived", "Архів"],
] as const;

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} год ${m} хв` : m ? `${m} хв ${s % 60} с` : `${s} с`;
}

function SettingsForm() {
  const { settings, refetch } = useAssistantSettings();
  const [form, setForm] = useState<AssistantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings) setForm(settings); }, [settings]);
  if (!form) return <p className="text-sm text-muted-foreground">Завантаження…</p>;
  const set = (k: keyof AssistantSettings, v: any) => setForm({ ...form, [k]: v });
  const save = async () => {
    setSaving(true);
    const { error } = await db.from("ai_assistant_settings").update({
      assistant_name: form.assistant_name, greeting: form.greeting, knowledge_base: form.knowledge_base,
      instructions: form.instructions, quick_questions: form.quick_questions, studio_url: form.studio_url.trim(),
      is_active: form.is_active, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setSaving(false);
    if (error) toast.error("Не вдалося зберегти: " + error.message); else { toast.success("Налаштування збережено"); refetch(); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /><Label>Помічник увімкнений</Label></div>
      <div><Label>Ім'я помічника</Label><Input value={form.assistant_name} onChange={(e) => set("assistant_name", e.target.value)} /></div>
      <div><Label>Привітання</Label><Textarea rows={3} value={form.greeting} onChange={(e) => set("greeting", e.target.value)} /></div>
      <div><Label>Посилання на сайт B&C studio</Label><Input placeholder="https://..." value={form.studio_url} onChange={(e) => set("studio_url", e.target.value)} /></div>
      <div><Label>База знань (послуги фото, відео, музики, ціни, умови)</Label><Textarea rows={10} value={form.knowledge_base} onChange={(e) => set("knowledge_base", e.target.value)} /></div>
      <div><Label>Інструкції (як поводитися)</Label><Textarea rows={5} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} /></div>
      <div><Label>Швидкі запитання (кожне з нового рядка)</Label><Textarea rows={5} value={form.quick_questions} onChange={(e) => set("quick_questions", e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">Модель: {form.model}. Помічник не має доступу до акцій, інвесторів, замовлень, виплат і представників.</p>
      <Button onClick={save} disabled={saving} className="min-h-[44px]">{saving ? "Збереження…" : "Зберегти"}</Button>
    </div>
  );
}

function Conversations() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("unread");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["ai-convs"],
    queryFn: async () => {
      const { data, error } = await db.from("ai_assistant_conversations").select("*").order("updated_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });
  const totals = useMemo(() => data.reduce((a, c) => ({
    req: a.req + c.request_count, inT: a.inT + c.input_tokens, outT: a.outT + c.output_tokens,
    cr: a.cr + Number(c.credits_used), ms: a.ms + Number(c.duration_ms),
  }), { req: 0, inT: 0, outT: 0, cr: 0, ms: 0 }), [data]);
  const counts = (s: string) => data.filter((c) => c.status === s).length;
  const setConvStatus = async (id: string, s: string) => {
    const { error } = await db.from("ai_assistant_conversations").update({ status: s }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["ai-convs"] });
  };
  const open = (c: any) => { setOpenId(openId === c.id ? null : c.id); if (c.status === "unread") setConvStatus(c.id, "read"); };
  const list = data.filter((c) => c.status === status);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Діалогів", data.length], ["Запитів", totals.req], ["Токенів", (totals.inT + totals.outT).toLocaleString("uk-UA")],
          ["Кредитів", totals.cr.toFixed(4)], ["Час роботи", fmtDuration(totals.ms)]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-lg font-bold">{v}</div></CardContent></Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Вхідних токенів: {totals.inT.toLocaleString("uk-UA")} · вихідних: {totals.outT.toLocaleString("uk-UA")}. Кредити — розрахункові за тарифом моделі (останні 500 діалогів).</p>
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="flex w-full flex-wrap h-auto">
          {STATUSES.map(([v, l]) => <TabsTrigger key={v} value={v} className="flex-1">{l} ({counts(v)})</TabsTrigger>)}
        </TabsList>
        <TabsContent value={status} className="space-y-2">
          {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Переписок немає</p>}
          {list.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button className="flex-1 min-w-0 text-left font-medium truncate min-h-[44px]" onClick={() => open(c)}>{c.title || "Без теми"}</button>
                  <Badge variant="outline">{c.source === "services" ? "Пошук послуг" : "Підтримка"}</Badge>
                  <Badge variant="secondary">{c.user_id ? "Користувач" : "Гість"}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleString("uk-UA")}</span>
                  <Select value={c.status} onValueChange={(v) => setConvStatus(c.id, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {openId === c.id && (
                  <div className="max-h-96 space-y-2 overflow-y-auto rounded-md bg-muted/40 p-3">
                    {(c.messages || []).map((m: any, i: number) => (
                      <div key={i} className="text-sm whitespace-pre-wrap">
                        <span className="font-semibold">{m.role === "user" ? "Клієнт" : "Помічник"}:</span> {m.content}
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground">Запитів: {c.request_count} · токенів: {c.input_tokens + c.output_tokens} · кредитів: {Number(c.credits_used).toFixed(5)} · час: {fmtDuration(Number(c.duration_ms))}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function AiAssistantTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Налаштування помічника</CardTitle></CardHeader><CardContent><SettingsForm /></CardContent></Card>
      <Card><CardHeader><CardTitle>Переписки та лічильники</CardTitle></CardHeader><CardContent><Conversations /></CardContent></Card>
    </div>
  );
}
