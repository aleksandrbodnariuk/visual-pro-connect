/**
 * ShareholderPayouts — блок виплат для панелі акціонера.
 * Акціонер бачить свої виплати та може підтвердити отримання.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DollarSign, CheckCircle2, Clock, AlertCircle, Loader2, Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PayoutRow {
  id: string;
  amount: number;
  base_income: number;
  title_bonus: number;
  order_ids: string[];
  shares_at_calculation: number;
  share_percent_at_calculation: number;
  title_at_calculation: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  confirmed_at: string | null;
}

function fmt(n: number) { return n.toFixed(2) + ' $'; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('uk-UA'); }

interface Props {
  userId: string;
}

export function ShareholderPayouts({ userId }: Props) {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<PayoutRow | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shareholder_payouts')
      .select('*')
      .eq('shareholder_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) setPayouts(data as PayoutRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmLoading(true);
    try {
      const { error } = await supabase.rpc('confirm_payout', {
        _payout_id: confirmDialog.id,
      } as any);
      if (error) throw error;
      toast({ title: 'Виплату підтверджено', description: 'Дякуємо за підтвердження!' });
      setConfirmDialog(null);
      await load();
    } catch (err: any) {
      toast({ title: 'Помилка', description: err.message, variant: 'destructive' });
    }
    setConfirmLoading(false);
  };

  const pending = useMemo(() => payouts.filter(p => p.status === 'pending'), [payouts]);
  const awaitingConfirm = useMemo(() => payouts.filter(p => p.status === 'paid'), [payouts]);
  const confirmed = useMemo(() => payouts.filter(p => p.status === 'confirmed'), [payouts]);

  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalAwaitingConfirm = awaitingConfirm.reduce((s, p) => s + p.amount, 0);
  const totalConfirmed = confirmed.reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Завантаження виплат…
        </CardContent>
      </Card>
    );
  }

  if (payouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            Виплати
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Виплат ще немає. Вони з'являться після розрахунку адміністратором.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Виплати
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground">На виплату</p>
            <p className="font-bold">{fmt(totalPending)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Очікує підтвердження</p>
            <p className="font-bold">{fmt(totalAwaitingConfirm)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-xs text-muted-foreground">Виплачено</p>
            <p className="font-bold text-green-600">{fmt(totalConfirmed)}</p>
          </div>
        </div>

        {/* Awaiting confirmation - highlighted */}
        {awaitingConfirm.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Підтвердіть отримання:</p>
            {awaitingConfirm.map(p => (
              <div key={p.id} className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{fmt(p.amount)}</span>
                    {p.title_at_calculation && <Badge variant="outline" className="text-xs">{p.title_at_calculation}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Базовий: {fmt(p.base_income)} · Титульний: {fmt(p.title_bonus)} · {p.order_ids.length} замовл. · Виплачено {p.paid_at ? fmtDate(p.paid_at) : ''}
                  </div>
                </div>
                <Button size="sm" onClick={() => setConfirmDialog(p)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Підтвердити
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* All payouts list */}
        {(pending.length > 0 || confirmed.length > 0) && (
          <div className="rounded-lg border divide-y">
            {[...pending, ...confirmed].map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{fmt(p.amount)}</span>
                    <Badge
                      variant={p.status === 'pending' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {p.status === 'pending' ? 'На виплату' : 'Підтверджено'}
                    </Badge>
                    {p.title_at_calculation && <Badge variant="outline" className="text-xs">{p.title_at_calculation}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Базовий: {fmt(p.base_income)} · Титульний: {fmt(p.title_bonus)} · {fmtDate(p.created_at)}
                    {p.confirmed_at && ` · Підтв. ${fmtDate(p.confirmed_at)}`}
                  </div>
                </div>
                {p.status === 'confirmed' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердити отримання виплати</DialogTitle>
            <DialogDescription>
              Після підтвердження виплата буде зарахована як отримана.
            </DialogDescription>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Сума:</span> <strong>{fmt(confirmDialog.amount)}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Базовий дохід:</span> {fmt(confirmDialog.base_income)}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Титульний бонус:</span> {fmt(confirmDialog.title_bonus)}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Замовлень:</span> {confirmDialog.order_ids.length}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Виплачено:</span> {confirmDialog.paid_at ? fmtDate(confirmDialog.paid_at) : '—'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Скасувати</Button>
            <Button onClick={handleConfirm} disabled={confirmLoading}>
              {confirmLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Підтверджую отримання
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
