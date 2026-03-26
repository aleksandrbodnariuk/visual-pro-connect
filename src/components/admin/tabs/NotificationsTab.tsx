import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NotificationsTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentHistory, setSentHistory] = useState<Array<{
    title: string;
    message: string;
    sentAt: string;
    usersCount: number;
  }>>([]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Введіть текст повідомлення");
      return;
    }

    setIsSending(true);
    try {
      // 1. Get all user IDs
      const { data: users, error: usersError } = await supabase
        .rpc('get_minimal_public_profiles');

      if (usersError) throw usersError;
      if (!users?.length) {
        toast.error("Немає користувачів для надсилання");
        return;
      }

      // 2. Insert notifications for all users
      const notifications = users.map((u: any) => ({
        user_id: u.id,
        message: message.trim(),
        link: link.trim() || null,
        is_read: false,
      }));

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(batch);
        if (insertError) throw insertError;
      }

      // 3. Send push notifications to all users (fire and forget)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const pushUrl = `https://${projectId}.supabase.co/functions/v1/send-push-notification`;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Send push in parallel batches
      const pushPromises = users.map((u: any) =>
        fetch(pushUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            user_id: u.id,
            title: title.trim() || 'Сповіщення',
            body: message.trim(),
            url: link.trim() || '/notifications',
          }),
        }).catch(() => {})
      );

      // Don't await all — fire and forget for speed
      Promise.allSettled(pushPromises);

      setSentHistory(prev => [{
        title: title.trim() || 'Сповіщення',
        message: message.trim(),
        sentAt: new Date().toLocaleString('uk-UA'),
        usersCount: users.length,
      }, ...prev]);

      setTitle("");
      setMessage("");
      setLink("");
      toast.success(`Сповіщення надіслано ${users.length} користувачам`);
    } catch (error: any) {
      console.error("Error sending broadcast:", error);
      toast.error(error.message || "Помилка при надсиланні сповіщення");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Масова розсилка сповіщень
          </CardTitle>
          <CardDescription>
            Надішліть важливе повідомлення всім користувачам платформи
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="notif-title">Заголовок (необов'язково)</Label>
            <Input
              id="notif-title"
              placeholder="Наприклад: Важливе оновлення"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isSending}
            />
          </div>

          <div>
            <Label htmlFor="notif-message">Текст повідомлення *</Label>
            <Textarea
              id="notif-message"
              placeholder="Введіть текст сповіщення для всіх користувачів..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/500</p>
          </div>

          <div>
            <Label htmlFor="notif-link">Посилання (необов'язково)</Label>
            <Input
              id="notif-link"
              placeholder="Наприклад: /stock-market або /settings"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Внутрішнє посилання, на яке перейде користувач при натисканні
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="w-full sm:w-auto"
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isSending ? "Надсилання..." : "Надіслати всім"}
          </Button>
        </CardContent>
      </Card>

      {sentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Історія розсилок (поточна сесія)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentHistory.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                    <p className="text-xs text-muted-foreground">{item.sentAt}</p>
                  </div>
                  <Badge variant="secondary">{item.usersCount} користувачів</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
