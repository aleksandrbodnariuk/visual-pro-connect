import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Clock,
  CheckCircle2,
  Loader2,
  Send,
  User,
  Filter,
  Inbox,
  Paperclip,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "Всі" },
  { value: "open", label: "Відкриті" },
  { value: "in_progress", label: "В роботі" },
  { value: "closed", label: "Закриті" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Відкрито", variant: "default" },
  in_progress: { label: "В роботі", variant: "secondary" },
  closed: { label: "Закрито", variant: "outline" },
};

const CATEGORY_MAP: Record<string, string> = {
  general: "Загальне",
  bug: "Помилка",
  feature: "Пропозиція",
  account: "Акаунт",
};

export function SupportTab() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [responding, setResponding] = useState(false);
  const [users, setUsers] = useState<Record<string, any>>({});

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    setLoading(true);
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false }) as any;

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setTickets(data || []);

    // Load user names
    const userIds = [...new Set((data || []).map((t: any) => t.user_id))] as string[];
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      
      const map: Record<string, any> = {};
      (usersData || []).forEach((u: any) => { map[u.id] = u; });
      setUsers(map);
    }

    setLoading(false);
  };

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setResponse(ticket.admin_response || "");
    setNewStatus(ticket.status);
  };

  const handleRespond = async () => {
    if (!selectedTicket || !user) return;
    setResponding(true);

    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (response.trim()) {
        updates.admin_response = response.trim();
        updates.responded_by = user.id;
        updates.responded_at = new Date().toISOString();
      }

      if (newStatus === "closed") {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", selectedTicket.id) as any;

      if (error) throw error;

      toast.success("Тікет оновлено");
      setSelectedTicket(null);
      loadTickets();
    } catch (err) {
      console.error(err);
      toast.error("Помилка оновлення тікета");
    } finally {
      setResponding(false);
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{tickets.length}</p>
          <p className="text-xs text-muted-foreground">Всього</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{openCount}</p>
          <p className="text-xs text-muted-foreground">Відкриті</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{inProgressCount}</p>
          <p className="text-xs text-muted-foreground">В роботі</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-accent-foreground">{tickets.filter((t) => t.status === "closed").length}</p>
          <p className="text-xs text-muted-foreground">Закриті</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Немає звернень</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = STATUS_MAP[ticket.status] || STATUS_MAP.open;
            const ticketUser = users[ticket.user_id];
            return (
              <Card
                key={ticket.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openTicket(ticket)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {ticketUser?.full_name || "Невідомий"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_MAP[ticket.category] || ticket.category}
                    </Badge>
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </div>
                </div>
                <h4 className="font-medium text-sm mb-1">{ticket.subject}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm", { locale: uk })}
                  {ticket.attachment_url && (
                    <span className="ml-2 flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Скриншот
                    </span>
                  )}
                  {ticket.admin_response && (
                    <span className="ml-2 flex items-center gap-1 text-primary">
                      <CheckCircle2 className="h-3 w-3" /> Є відповідь
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Response dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Звернення</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Від</p>
                <p className="font-medium">{users[selectedTicket.user_id]?.full_name || "Невідомий"}</p>
              </div>

              <div className="flex gap-2">
                <Badge variant="outline">{CATEGORY_MAP[selectedTicket.category]}</Badge>
                <Badge variant={STATUS_MAP[selectedTicket.status]?.variant}>
                  {STATUS_MAP[selectedTicket.status]?.label}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Тема</p>
                <p className="font-medium">{selectedTicket.subject}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Повідомлення</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                  {selectedTicket.message}
                </p>
              </div>

              {selectedTicket.attachment_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Скриншот</p>
                  <a
                    href={selectedTicket.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-fit"
                  >
                    <img
                      src={selectedTicket.attachment_url}
                      alt="Скриншот користувача"
                      className="max-h-64 rounded-md border border-border object-contain hover:opacity-80 transition-opacity"
                      loading="lazy"
                    />
                  </a>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {format(new Date(selectedTicket.created_at), "dd MMMM yyyy, HH:mm", { locale: uk })}
              </div>

              <hr />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Статус</p>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Відкрито</SelectItem>
                      <SelectItem value="in_progress">В роботі</SelectItem>
                      <SelectItem value="closed">Закрито</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Відповідь</p>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Напишіть відповідь користувачу..."
                    rows={4}
                    maxLength={2000}
                  />
                </div>

                <Button onClick={handleRespond} disabled={responding} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {responding ? "Збереження..." : "Зберегти"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
