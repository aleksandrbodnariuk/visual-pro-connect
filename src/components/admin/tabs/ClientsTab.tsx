import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarHeart, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClients, ClientWithUser } from "../clients/useClients";
import { AddClientDialog } from "../clients/AddClientDialog";
import { ClientEventsDialog } from "../clients/ClientEventsDialog";
import { UpcomingGreetings } from "../clients/UpcomingGreetings";
import { clientTypeLabel } from "../clients/clientTypes";

export function ClientsTab() {
  const { clients, upcoming, isLoading, reload } = useClients();
  const [addOpen, setAddOpen] = useState(false);
  const [eventsFor, setEventsFor] = useState<ClientWithUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ClientWithUser | null>(null);
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.display_name || "").toLowerCase().includes(q) ||
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q)
    );
  });

  const removeClient = async () => {
    if (!removeTarget) return;
    const { error } = await supabase.from("client_profiles").delete().eq("id", removeTarget.id);
    if (error) {
      toast.error("Не вдалося видалити клієнта");
    } else {
      await supabase.from("user_roles").delete().eq("user_id", removeTarget.user_id).eq("role", "client" as any);
      toast.success("Статус клієнта знято");
      reload();
    }
    setRemoveTarget(null);
  };

  const current = eventsFor ? clients.find((c) => c.id === eventsFor.id) || null : null;

  return (
    <div className="space-y-6">
      <UpcomingGreetings items={upcoming} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Клієнти ({clients.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Пошук клієнта"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Додати клієнта
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Завантаження...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Клієнтів ще немає.</p>
          )}
          {filtered.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={c.avatar_url || undefined} />
                <AvatarFallback>{(c.display_name || c.full_name || "К")[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {c.display_name || c.full_name || "Клієнт"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.full_name && c.display_name ? `${c.full_name} · ` : ""}
                  {c.city || "—"} · {c.phone_number || ""}
                </div>
              </div>
              <Badge variant="secondary">{clientTypeLabel(c.client_type)}</Badge>
              <Badge variant="outline">{c.events.length} дат</Badge>
              <Button variant="outline" size="sm" onClick={() => setEventsFor(c)}>
                <CalendarHeart className="mr-1 h-4 w-4" /> Дати
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setRemoveTarget(c)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} onSaved={reload} />
      <ClientEventsDialog
        client={current}
        open={!!eventsFor}
        onOpenChange={(v) => !v && setEventsFor(null)}
        onSaved={reload}
      />

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Зняти статус клієнта?</AlertDialogTitle>
            <AlertDialogDescription>
              Картку клієнта та його пам'ятні дати буде видалено. Обліковий запис користувача залишиться.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={removeClient}>Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}