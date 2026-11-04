import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Send, RotateCcw } from "lucide-react";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-assistant`;

function guestToken() {
  let t = localStorage.getItem("ai_guest_token");
  if (!t) { t = crypto.randomUUID(); localStorage.setItem("ai_guest_token", t); }
  return t;
}

export function AssistantChat({ source, className }: { source: "support" | "services"; className?: string }) {
  const { settings } = useAssistantSettings();
  const storeKey = `ai_conv_${source}`;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(storeKey + "_msgs") || "[]"); } catch { return []; }
  });
  const [convId, setConvId] = useState<string | null>(() => sessionStorage.getItem(storeKey));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { sessionStorage.setItem(storeKey + "_msgs", JSON.stringify(messages)); endRef.current?.scrollIntoView({ block: "end" }); }, [messages, storeKey]);
  useEffect(() => { if (!busy) taRef.current?.focus(); }, [busy]);

  const quick = (settings?.quick_questions || "").split("\n").map((s) => s.trim()).filter(Boolean);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setError(null); setInput(""); setBusy(true);
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: msg, source, conversationId: convId, guestToken: session ? null : guestToken() }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Помічник недоступний");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
          if (!line.startsWith("data:")) continue;
          const p = line.slice(5).trim();
          if (p === "[DONE]") continue;
          const j = JSON.parse(p);
          if (j.conversationId) { setConvId(j.conversationId); sessionStorage.setItem(storeKey, j.conversationId); }
          if (j.delta) setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: c[c.length - 1].content + j.delta }; return c; });
          if (j.error) setError(j.error);
        }
      }
    } catch (e: any) {
      setError(e.message);
      setMessages((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
    } finally { setBusy(false); }
  };

  const reset = () => { setMessages([]); setConvId(null); sessionStorage.removeItem(storeKey); };

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{settings?.assistant_name || "Помічник B&C studio"}</div>
          <div className="text-xs text-muted-foreground">ШІ-консультант · переписка зберігається</div>
        </div>
        {messages.length > 0 && <Button variant="ghost" size="icon" onClick={reset} aria-label="Нова розмова"><RotateCcw className="h-4 w-4" /></Button>}
      </div>
      <div className="flex-1 min-h-[240px] max-h-[55vh] overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <>
            <p className="text-sm">{settings?.greeting}</p>
            <div className="flex flex-wrap gap-2">
              {quick.map((q) => <Button key={q} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => send(q)}>{q}</Button>)}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("text-sm whitespace-pre-wrap", m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground" : "max-w-[95%]")}>
            {m.content || (busy && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
          </div>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <Textarea ref={taRef} value={input} maxLength={2000} rows={1} placeholder="Напишіть запитання..." className="min-h-[44px] resize-none"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || !input.trim()} aria-label="Надіслати">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
