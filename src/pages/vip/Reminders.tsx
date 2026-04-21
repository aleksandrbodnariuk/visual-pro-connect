import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BellRing,
  Crown,
  Loader2,
  Plus,
  Trash2,
  Check,
  Clock,
  CalendarClock,
  Bell,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import { useVipReminders, type VipReminder } from "@/hooks/vip/useVipReminders";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
} from "@/lib/pushNotifications";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function VipReminders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vip, loading: vipLoading } = useUserVip(user?.id);
  const { reminders, loading, createReminder, updateReminder, deleteReminder } =
    useVipReminders(user?.id);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [pushEnabled, setPushEnabled] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (isPushSupported()) setPushPermission(getNotificationPermission());
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: reminders.filter((r) => new Date(r.remind_at).getTime() >= now && r.status === "active"),
      past: reminders.filter(
        (r) => new Date(r.remind_at).getTime() < now || r.status !== "active"
      ),
    };
  }, [reminders]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    setRemindAt(toLocalInputValue(d));
    setPushEnabled(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Введіть заголовок");
      return;
    }
    if (!remindAt) {
      toast.error("Оберіть дату і час");
      return;
    }
    setSubmitting(true);
    const iso = new Date(remindAt).toISOString();
    const { error } = await createReminder({
      title: title.trim(),
      description: description.trim(),
      remind_at: iso,
      push_enabled: pushEnabled,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Не вдалося створити нагадування");
      return;
    }
    toast.success("Нагадування створено");
    resetForm();
    setOpen(false);
  };

  const handleEnablePush = async () => {
    if (!isPushSupported()) {
      toast.error("Push-сповіщення не підтримуються в цьому браузері");
      return;
    }
    setPushBusy(true);
    try {
      const perm = await requestNotificationPermission();
      setPushPermission(perm);
      if (perm !== "granted") {
        toast.error("Дозвіл на сповіщення не надано");
        return;
      }
      const sub = await subscribeToPush(undefined, { forceRefresh: true });
      if (sub) toast.success("Push-сповіщення увімкнено");
      else toast.error("Не вдалося підписатися");
    } catch (err: any) {
      toast.error(`Помилка: ${err?.message || err}`);
    } finally {
      setPushBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб користуватись нагадуваннями</p>
          <Button onClick={() => navigate("/auth")}>Увійти</Button>
        </main>
      </div>
    );
  }

  if (vipLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!vip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <Card className="p-6 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 flex items-center gap-4 flex-wrap">
            <Crown className="h-10 w-10 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">Нагадування доступні лише VIP</h3>
              <p className="text-sm text-muted-foreground">
                Оформіть VIP-членство, щоб користуватись цим інструментом.
              </p>
            </div>
            <Button onClick={() => navigate("/vip")}>Тарифи VIP</Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        <aside className="hidden lg:block col-span-3">
          <Sidebar className="sticky top-20" />
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-5 pb-24 md:pb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BellRing className="h-7 w-7 text-amber-500" /> Нагадування + push
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/vip/tools")}>
                ← Інструменти
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Нове
              </Button>
            </div>
          </div>

          {/* Push status card */}
          <Card className="p-4 flex items-center gap-3 flex-wrap">
            {pushPermission === "granted" ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {pushPermission === "granted"
                  ? "Push-сповіщення увімкнено"
                  : pushPermission === "denied"
                  ? "Сповіщення заблоковані в браузері"
                  : "Push-сповіщення вимкнено"}
              </p>
              <p className="text-xs text-muted-foreground">
                Увімкніть, щоб отримувати нагадування навіть коли додаток закритий.
              </p>
            </div>
            {pushPermission !== "granted" && (
              <Button
                size="sm"
                onClick={handleEnablePush}
                disabled={pushBusy || pushPermission === "denied"}
              >
                {pushBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Увімкнути push"
                )}
              </Button>
            )}
          </Card>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-bold text-lg mb-1">Поки що немає нагадувань</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Створіть перше — про важливу зустріч, оплату або зйомку.
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Створити нагадування
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {upcoming.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Майбутні
                  </h2>
                  <div className="space-y-2">
                    {upcoming.map((r) => (
                      <ReminderRow
                        key={r.id}
                        reminder={r}
                        onDone={() => updateReminder(r.id, { status: "done" })}
                        onDelete={() => setDeleteId(r.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Минулі / виконані
                  </h2>
                  <div className="space-y-2 opacity-70">
                    {past.map((r) => (
                      <ReminderRow
                        key={r.id}
                        reminder={r}
                        onDone={() => updateReminder(r.id, { status: "done" })}
                        onDelete={() => setDeleteId(r.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нове нагадування</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Заголовок *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Наприклад: Дзвінок клієнту"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Опис</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Деталі (необов'язково)"
                rows={3}
                maxLength={2000}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Дата і час *</label>
              <Input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Push-сповіщення</p>
                <p className="text-xs text-muted-foreground">
                  Надіслати push, коли настане час
                </p>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Скасувати
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Створити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити нагадування?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію не можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                const { error } = await deleteReminder(deleteId);
                if (error) toast.error("Не вдалося видалити");
                else toast.success("Нагадування видалено");
                setDeleteId(null);
              }}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReminderRow({
  reminder,
  onDone,
  onDelete,
}: {
  reminder: VipReminder;
  onDone: () => void;
  onDelete: () => void;
}) {
  const isDone = reminder.status === "done";
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
        <Clock className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3 className={`font-semibold ${isDone ? "line-through" : ""}`}>
            {reminder.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {reminder.push_enabled && <Bell className="h-3 w-3" />}
            {formatDateTime(reminder.remind_at)}
          </div>
        </div>
        {reminder.description && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
            {reminder.description}
          </p>
        )}
        {isDone && (
          <Badge variant="outline" className="mt-2 text-[10px]">
            Виконано
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {!isDone && (
          <Button size="icon" variant="ghost" onClick={onDone} title="Позначити виконаним">
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={onDelete} title="Видалити">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}