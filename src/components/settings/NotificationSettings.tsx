import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushNotifications';

export function NotificationSettings() {
  const [pushSupported, setPushSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (supported) {
      setPermission(getNotificationPermission());
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    setLoading(true);
    try {
      if (enabled) {
        const perm = await requestNotificationPermission();
        setPermission(perm);
        if (perm !== 'granted') {
          toast.error('Дозвіл на сповіщення не надано');
          setLoading(false);
          return;
        }
        const sub = await subscribeToPush();
        if (sub) {
          setIsSubscribed(true);
          toast.success('Push сповіщення увімкнено');
        } else {
          toast.error('Не вдалося підписатися на сповіщення');
        }
      } else {
        const success = await unsubscribeFromPush();
        if (success) {
          setIsSubscribed(false);
          toast.success('Push сповіщення вимкнено');
        }
      }
    } catch (err) {
      console.error('[Push] Toggle error:', err);
      toast.error('Помилка при зміні налаштувань сповіщень');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Налаштування сповіщень</CardTitle>
        <CardDescription>Керуйте сповіщеннями, які ви отримуєте</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Push сповіщення</p>
              <p className="text-sm text-muted-foreground">
                Отримуйте сповіщення про нові повідомлення навіть коли додаток закритий
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading || !pushSupported || permission === 'denied'}
          />
        </div>

        {!pushSupported && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
            <Smartphone className="h-4 w-4 shrink-0" />
            <p>Push сповіщення не підтримуються у цьому браузері. Спробуйте встановити додаток як PWA.</p>
          </div>
        )}

        {permission === 'denied' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
            <BellOff className="h-4 w-4 shrink-0" />
            <p>Сповіщення заблоковані у налаштуваннях браузера. Розблокуйте їх у налаштуваннях сайту.</p>
          </div>
        )}

        {isSubscribed && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>✓ Нові приватні повідомлення</p>
            <p className="text-xs opacity-70">Більше подій буде додано найближчим часом</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
