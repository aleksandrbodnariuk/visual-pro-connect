
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Check, X, Archive, UserPlus, Trash2, TrendingUp, Banknote, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SpecialistOrder, OrderParticipant, OrderType, ORDER_TYPE_LABELS, ORDER_TYPE_COLORS, STATUS_LABELS } from './types';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { calcNetProfit } from '@/lib/shareholderCalculations';
import { ProfitPreviewBlock } from './ProfitPreviewBlock';
import { toast } from 'sonner';

interface SpecialistInfo {
  id: string;
  full_name: string;
  avatar_url: string;
}

interface Props {
  order: SpecialistOrder | null;
  participants: OrderParticipant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<SpecialistOrder>) => Promise<boolean>;
  onAddParticipant: (orderId: string, specialistId: string, role: string) => Promise<boolean>;
  onRemoveParticipant: (participantId: string) => Promise<boolean>;
  onDelete?: (orderId: string) => void;
  isAdmin: boolean;
}

export function OrderDetailsModal({ order, participants, open, onOpenChange, onUpdate, onAddParticipant, onRemoveParticipant, onDelete, isAdmin }: Props) {
  const [editing, setEditing] = useState(false);
  const [editingFinancials, setEditingFinancials] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('photo');
  const [date, setDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  // Фінансові поля — єдине джерело правди
  const [orderAmount, setOrderAmount] = useState('');
  const [orderExpenses, setOrderExpenses] = useState('');
  const [financialNotes, setFinancialNotes] = useState('');

  // Локальний знімок збережених фінансових даних — щоб read-only блок оновлювався одразу після save
  const [savedAmount, setSavedAmount] = useState<number | null>(null);
  const [savedExpenses, setSavedExpenses] = useState<number | null>(null);
  const [savedFinancialNotes, setSavedFinancialNotes] = useState<string | null>(null);

  const [specialists, setSpecialists] = useState<SpecialistInfo[]>([]);
  const [participantInfos, setParticipantInfos] = useState<Record<string, SpecialistInfo>>({});
  const [addSpecId, setAddSpecId] = useState('');
  const [addSpecRole, setAddSpecRole] = useState<OrderType>('photo');
  const [profitDistributed, setProfitDistributed] = useState<boolean | null>(null);
  const [distributing, setDistributing] = useState(false);

  // Specialist payouts state
  const [specAmounts, setSpecAmounts] = useState<Record<string, string>>({});
  const [specPayoutsExist, setSpecPayoutsExist] = useState<boolean>(false);
  const [savingSpecPayouts, setSavingSpecPayouts] = useState(false);
  const [existingSpecPayouts, setExistingSpecPayouts] = useState<any[]>([]);

  useEffect(() => {
    if (order) {
      setTitle(order.title);
      setDescription(order.description || '');
      setOrderType(order.order_type);
      setDate(parseISO(order.order_date));
      setNotes(order.notes || '');

      // Фінансові поля
      const amt = order.order_amount != null ? String(order.order_amount) : '';
      const exp = order.order_expenses != null ? String(order.order_expenses) : '';
      setOrderAmount(amt);
      setOrderExpenses(exp);
      setFinancialNotes(order.financial_notes || '');

      // Синхронізуємо локальний знімок з props
      setSavedAmount(order.order_amount ?? null);
      setSavedExpenses(order.order_expenses ?? null);
      setSavedFinancialNotes(order.financial_notes ?? null);

      setEditing(false);
      setEditingFinancials(false);
    }
  }, [order]);

  // Load specialists list for admin
  useEffect(() => {
    if (!isAdmin || !open) return;
    supabase.rpc('get_specialists').then(({ data }) => {
      if (data) setSpecialists(data as SpecialistInfo[]);
    });
  }, [isAdmin, open]);

  // Load participant names
  useEffect(() => {
    if (participants.length === 0) return;
    const ids = participants.map(p => p.specialist_id);
    supabase.rpc('get_safe_public_profiles_by_ids', { _ids: ids }).then(({ data }) => {
      if (data) {
        const map: Record<string, SpecialistInfo> = {};
        (data as any[]).forEach(u => { map[u.id] = u; });
        setParticipantInfos(map);
      }
    });
  }, [participants]);

  // Check if profit was already distributed
  useEffect(() => {
    if (!order || !isAdmin || !open) {
      setProfitDistributed(null);
      return;
    }
    (supabase as any)
      .from('financial_audit_log')
      .select('id')
      .eq('order_id', order.id)
      .limit(1)
      .then(({ data }: any) => {
        setProfitDistributed(data && data.length > 0);
      });
  }, [order?.id, isAdmin, open]);

  // Load existing specialist payouts for this order
  useEffect(() => {
    if (!order || !isAdmin || !open) {
      setSpecPayoutsExist(false);
      setExistingSpecPayouts([]);
      setSpecAmounts({});
      return;
    }
    (supabase as any)
      .from('specialist_payouts')
      .select('*')
      .eq('order_id', order.id)
      .then(({ data }: any) => {
        const payouts = data || [];
        setExistingSpecPayouts(payouts);
        setSpecPayoutsExist(payouts.length > 0);
        // Pre-fill amounts from existing payouts
        const amounts: Record<string, string> = {};
        payouts.forEach((p: any) => {
          amounts[p.specialist_id] = String(p.amount);
        });
        setSpecAmounts(amounts);
      });
  }, [order?.id, isAdmin, open]);

  const handleSaveSpecPayouts = useCallback(async () => {
    if (!order) return;
    setSavingSpecPayouts(true);
    try {
      // Delete existing payouts for this order first
      if (specPayoutsExist) {
        await (supabase as any).from('specialist_payouts').delete().eq('order_id', order.id);
      }
      // Insert new ones
      const inserts: any[] = [];
      for (const p of participants) {
        const amt = parseFloat(specAmounts[p.specialist_id] || '0');
        if (amt > 0) {
          inserts.push({
            specialist_id: p.specialist_id,
            order_id: order.id,
            amount: Math.round(amt * 100) / 100,
            role_at_calculation: p.role,
            status: 'pending',
            notes: `Замовлення: ${order.title}`,
          });
        }
      }
      if (inserts.length > 0) {
        const { error } = await (supabase as any).from('specialist_payouts').insert(inserts);
        if (error) throw error;
      }
      setSpecPayoutsExist(inserts.length > 0);
      setExistingSpecPayouts(inserts);
      toast.success(`Збережено виплати для ${inserts.length} фахівців`);
    } catch (err: any) {
      toast.error(err.message || 'Помилка збереження');
    } finally {
      setSavingSpecPayouts(false);
    }
  }, [order, participants, specAmounts, specPayoutsExist]);

  if (!order) return null;

  const handleSave = async () => {
    if (!date) return;

    if (addSpecId) {
      await onAddParticipant(order.id, addSpecId, addSpecRole);
      setAddSpecId('');
    }

    const success = await onUpdate(order.id, {
      title: title.trim(),
      description: description.trim() || null,
      order_type: orderType,
      order_date: format(date, 'yyyy-MM-dd'),
      notes: notes.trim() || null,
      // price поле більше не оновлюємо з форми — воно є legacy
    });
    if (success) setEditing(false);
  };

  const handleSaveFinancials = async () => {
    const newAmount = orderAmount ? Number(orderAmount) : null;
    const newExpenses = orderExpenses ? Number(orderExpenses) : null;
    const newNotes = financialNotes.trim() || null;

    const success = await onUpdate(order.id, {
      order_amount: newAmount,
      order_expenses: newExpenses,
      financial_notes: newNotes,
      financials_updated_at: new Date().toISOString(),
    });

    if (success) {
      // Одразу оновлюємо локальний знімок — UI відображає правильні значення без повторного відкриття
      setSavedAmount(newAmount);
      setSavedExpenses(newExpenses);
      setSavedFinancialNotes(newNotes);
      setEditingFinancials(false);
    }
  };

  // Чистий прибуток — читаємо з локального знімку (завжди актуальний після save)
  const hasFinancials = savedAmount !== null || savedExpenses !== null;
  const netProfit = hasFinancials
    ? calcNetProfit(savedAmount ?? 0, savedExpenses ?? 0)
    : null;

  // Попередній прибуток під час редагування — з поточних input-значень
  const previewNetProfit = (orderAmount || orderExpenses)
    ? calcNetProfit(orderAmount ? Number(orderAmount) : 0, orderExpenses ? Number(orderExpenses) : 0)
    : null;

  const handleConfirm = () => onUpdate(order.id, { status: 'confirmed' });
  const handleReject = () => onUpdate(order.id, { status: 'pending' });
  const handleArchive = () => onUpdate(order.id, { status: 'archived' });

  const handleAddParticipant = async () => {
    if (!addSpecId) return;
    await onAddParticipant(order.id, addSpecId, addSpecRole);
    setAddSpecId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', ORDER_TYPE_COLORS[order.order_type as keyof typeof ORDER_TYPE_COLORS])} />
            {editing ? 'Редагування' : order.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {editing && isAdmin ? (
            <>
              <div>
                <Label>Назва</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Опис</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Тип</Label>
                <Select value={orderType} onValueChange={v => setOrderType(v as OrderType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_TYPE_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Дата</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'd MMMM yyyy', { locale: uk }) : 'Оберіть дату'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={uk} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Нотатки</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">Зберегти дані замовлення</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Скасувати</Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Тип:</span>
                  <Badge variant="outline" className="ml-2">
                    {ORDER_TYPE_LABELS[order.order_type as keyof typeof ORDER_TYPE_LABELS]}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>
                  <Badge variant="secondary" className="ml-2">
                    {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Дата:</span>
                  <span className="ml-2 font-medium">{format(parseISO(order.order_date), 'd MMM yyyy', { locale: uk })}</span>
                </div>
              </div>
              {order.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Опис:</span>
                  <p className="text-sm mt-1">{order.description}</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Нотатки:</span>
                  <p className="text-sm mt-1">{order.notes}</p>
                </div>
              )}
            </>
          )}

          <Separator />

          {/* Participants */}
          <div>
            <h4 className="text-sm font-medium mb-2">Команда фахівців</h4>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Немає учасників</p>
            ) : (
              <div className="space-y-1.5">
                {participants.map(p => {
                  const info = participantInfos[p.specialist_id];
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span>{info?.full_name || 'Завантаження...'}</span>
                        <Badge variant="outline" className="text-xs">
                          {ORDER_TYPE_LABELS[p.role as keyof typeof ORDER_TYPE_LABELS] || p.role}
                        </Badge>
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveParticipant(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add participant (admin only) */}
            {isAdmin && (
              <div className="flex gap-2 mt-2">
                <Select value={addSpecId} onValueChange={setAddSpecId}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Обрати фахівця" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialists
                      .filter(s => !participants.some(p => p.specialist_id === s.id))
                      .map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={addSpecRole} onValueChange={v => setAddSpecRole(v as OrderType)}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_TYPE_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8" onClick={handleAddParticipant} disabled={!addSpecId}>
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* ── Фінанси замовлення (тільки адміністратор) ── */}
          {isAdmin && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Фінанси замовлення
                  </h4>
                  {!editingFinancials && !editing && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingFinancials(true); setEditing(false); }}>
                      Редагувати
                    </Button>
                  )}
                </div>

                {editingFinancials ? (
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Сума замовлення ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={orderAmount}
                          onChange={e => setOrderAmount(e.target.value)}
                          placeholder="0"
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Витрати ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={orderExpenses}
                          onChange={e => setOrderExpenses(e.target.value)}
                          placeholder="0"
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Примітка до фінансів</Label>
                      <Textarea
                        value={financialNotes}
                        onChange={e => setFinancialNotes(e.target.value)}
                        rows={2}
                        placeholder="Коментар до витрат або доходів..."
                        className="text-sm mt-1"
                      />
                    </div>
                    {/* Попередній чистий прибуток під час редагування */}
                    {previewNetProfit !== null && (
                      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Чистий прибуток:</span>
                        <span className="font-semibold text-primary">
                          {previewNetProfit.toFixed(2)} $
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveFinancials} className="flex-1">Зберегти фінанси</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        // Скидаємо введені зміни до збереженого знімку
                        setOrderAmount(savedAmount != null ? String(savedAmount) : '');
                        setOrderExpenses(savedExpenses != null ? String(savedExpenses) : '');
                        setFinancialNotes(savedFinancialNotes || '');
                        setEditingFinancials(false);
                      }}>Скасувати</Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border p-3 space-y-2 text-sm">
                    {netProfit !== null ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Сума замовлення:</span>
                          <span>{(savedAmount ?? 0).toFixed(2)} $</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Витрати:</span>
                          <span>{(savedExpenses ?? 0).toFixed(2)} $</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Чистий прибуток:</span>
                          <span className="text-primary">{netProfit.toFixed(2)} $</span>
                        </div>
                        {savedFinancialNotes && (
                          <p className="text-xs text-muted-foreground pt-1">{savedFinancialNotes}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs">Фінансові дані не введені</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Попередній розрахунок розподілу прибутку (read-only) ── */}
          {isAdmin && !editing && !editingFinancials && (
            <>
              <Separator />
              <ProfitPreviewBlock
                orderAmount={savedAmount}
                orderExpenses={savedExpenses}
                participants={participants}
                participantInfos={participantInfos}
                representativeId={order.representative_id}
              />
            </>
          )}

          {/* Admin actions */}
          {isAdmin && !editing && !editingFinancials && (
            <>
              <Separator />

              {/* Distribute profit button */}
              {order.status === 'confirmed' && hasFinancials && savedAmount != null && savedAmount > 0 && (
                <div className="rounded-lg border p-3 space-y-2">
                  {profitDistributed === true ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                      <span className="font-medium">Прибуток вже розподілено</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Натисніть, щоб розподілити прибуток між представниками, акціонерами та фондами.
                      </p>
                      <Button
                        size="sm"
                        disabled={distributing}
                        className="w-full"
                        onClick={async () => {
                          setDistributing(true);
                          try {
                            const { data, error } = await supabase.rpc('process_order_profit', { _order_id: order.id });
                            if (error) throw error;
                            toast.success('Прибуток успішно розподілено');
                            setProfitDistributed(true);
                          } catch (err: any) {
                            console.error('process_order_profit error:', err);
                            toast.error(err.message || 'Помилка розподілу прибутку');
                          } finally {
                            setDistributing(false);
                          }
                        }}
                      >
                        {distributing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Banknote className="h-4 w-4 mr-2" />
                        )}
                        Розподілити прибуток
                      </Button>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(true); setEditingFinancials(false); }}>
                  Редагувати
                </Button>
                {order.status === 'pending' && (
                  <Button size="sm" onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
                    <Check className="h-3.5 w-3.5 mr-1" /> Підтвердити
                  </Button>
                )}
                {(order.status === 'confirmed' || order.status === 'archived') && (
                  <Button size="sm" variant="outline" onClick={handleReject}>
                    <X className="h-3.5 w-3.5 mr-1" /> Повернути
                  </Button>
                )}
                {order.status !== 'archived' && (
                  <Button size="sm" variant="secondary" onClick={handleArchive}>
                    <Archive className="h-3.5 w-3.5 mr-1" /> В архів
                  </Button>
                )}
                {order.status === 'archived' && onDelete && (
                  <Button size="sm" variant="destructive" onClick={() => onDelete(order.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Видалити
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
