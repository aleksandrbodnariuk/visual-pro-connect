import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageCircle, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

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

export function SupportTicketsList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }) as any;

    if (!error) setTickets(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>У вас ще немає звернень</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
      {tickets.map((ticket) => {
        const status = STATUS_MAP[ticket.status] || STATUS_MAP.open;
        return (
          <Card key={ticket.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-1">{ticket.subject}</h4>
              <Badge variant={status.variant} className="shrink-0 text-xs">
                {status.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">{CATEGORY_MAP[ticket.category] || ticket.category}</Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm", { locale: uk })}
              </span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>

            {ticket.admin_response && (
              <div className="mt-2 p-3 rounded-md bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Відповідь підтримки</span>
                </div>
                <p className="text-sm">{ticket.admin_response}</p>
                {ticket.responded_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(ticket.responded_at), "dd MMM yyyy, HH:mm", { locale: uk })}
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
