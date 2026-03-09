import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { History, Eye, Loader2, AlertCircle, ChevronDown, ChevronUp, Briefcase, Crown } from "lucide-react";
import { toast } from "sonner";

interface Snapshot {
  id: string;
  created_at: string;
  period_label: string;
  confirmed_orders_count: number;
  total_net_profit: number;
  shareholders_pool_20: number;
  title_bonus_pool_17_5: number;
  notes: string | null;
  snapshot_payload: any;
}

function fmt(n: number) {
  return n.toFixed(2) + " ₴";
}

export function CalculationHistoryTab() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [specialistsOpen, setSpecialistsOpen] = useState(false);
  const [shareholdersOpen, setShareholdersOpen] = useState(false);

  useEffect(() => {
    const fetchSnapshots = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("calculation_snapshots")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Не вдалося завантажити історію");
        console.error(error);
      } else {
        setSnapshots(data || []);
      }
      setLoading(false);
    };
    fetchSnapshots();
  }, []);

  const openDetails = (snap: Snapshot) => {
    setSelectedSnapshot(snap);
    setDetailsOpen(true);
    setOrdersOpen(false);
    setSpecialistsOpen(false);
    setShareholdersOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Завантаження історії…</span>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 text-amber-800 dark:text-amber-300">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Збережених розрахунків ще немає</p>
          <p className="text-xs mt-1 opacity-80">Перейдіть у вкладку «Фінанси» і натисніть «Зберегти розрахунок».</p>
        </div>
      </div>
    );
  }

  const payload = selectedSnapshot?.snapshot_payload || {};
  const summary = payload.summary || {};
  const orders = payload.orders || [];
  const specialists = payload.specialists || [];
  const shareholders = payload.shareholders || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        Історія розрахунків
      </h2>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Період</TableHead>
                <TableHead className="text-right">Замовлень</TableHead>
                <TableHead className="text-right">Чистий прибуток</TableHead>
                <TableHead>Примітка</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snap) => (
                <TableRow key={snap.id}>
                  <TableCell className="whitespace-nowrap">{format(new Date(snap.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                  <TableCell>{snap.period_label}</TableCell>
                  <TableCell className="text-right">{snap.confirmed_orders_count}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(snap.total_net_profit))}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">{snap.notes || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openDetails(snap)}>
                      <Eye className="h-4 w-4 mr-1" /> Відкрити
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Деталі розрахунку</DialogTitle>
          </DialogHeader>
          {selectedSnapshot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">Період:</span><br /><strong>{summary.period}</strong></div>
                <div><span className="text-muted-foreground">Замовлень:</span><br /><strong>{summary.confirmed_orders_count}</strong></div>
                <div><span className="text-muted-foreground">Сума:</span><br /><strong>{fmt(summary.total_amount || 0)}</strong></div>
                <div><span className="text-muted-foreground">Чистий прибуток:</span><br /><strong className="text-green-600">{fmt(summary.total_net_profit || 0)}</strong></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t pt-3">
                <div><span className="text-muted-foreground">50% фахівцям:</span><br />{fmt(summary.specialists_pool || 0)}</div>
                <div><span className="text-muted-foreground">20% акціям:</span><br />{fmt(summary.shareholders_pool || 0)}</div>
                <div><span className="text-muted-foreground">17.5% бонуси:</span><br />{fmt(summary.title_bonus_pool || 0)}</div>
                <div><span className="text-muted-foreground">12.5% адмін:</span><br />{fmt(summary.admin_fund || 0)}</div>
              </div>

              {/* Orders */}
              <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Замовлення ({orders.length})</span>
                    {ordersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Назва</TableHead><TableHead>Дата</TableHead><TableHead className="text-right">Чистий</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {orders.map((o: any) => (
                        <TableRow key={o.id}><TableCell>{o.title}</TableCell><TableCell>{o.order_date}</TableCell><TableCell className="text-right">{fmt(o.net_profit)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>

              {/* Specialists */}
              <Collapsible open={specialistsOpen} onOpenChange={setSpecialistsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Фахівці ({specialists.length})</span>
                    {specialistsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Фахівець</TableHead><TableHead className="text-right">Замовлень</TableHead><TableHead className="text-right">Прогноз</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {specialists.map((s: any) => (
                        <TableRow key={s.user_id}><TableCell>{s.name}</TableCell><TableCell className="text-right">{s.orders_count}</TableCell><TableCell className="text-right">{fmt(s.projected_income)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>

              {/* Shareholders */}
              <Collapsible open={shareholdersOpen} onOpenChange={setShareholdersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2"><Crown className="h-4 w-4" /> Акціонери ({shareholders.length})</span>
                    {shareholdersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Акціонер</TableHead><TableHead>Титул</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">Разом</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {shareholders.map((sh: any) => (
                        <TableRow key={sh.user_id}><TableCell>{sh.name}</TableCell><TableCell><Badge variant="secondary">{sh.title}</Badge></TableCell><TableCell className="text-right">{sh.percent.toFixed(2)}%</TableCell><TableCell className="text-right">{fmt(sh.total_income)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
