
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Check, X, Archive, UserPlus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SpecialistOrder, OrderParticipant, OrderType, ORDER_TYPE_LABELS, ORDER_TYPE_COLORS, STATUS_LABELS } from './types';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

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
  isAdmin: boolean;
}

export function OrderDetailsModal({ order, participants, open, onOpenChange, onUpdate, onAddParticipant, onRemoveParticipant, isAdmin }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('photo');
  const [date, setDate] = useState<Date | undefined>();
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [specialists, setSpecialists] = useState<SpecialistInfo[]>([]);
  const [participantInfos, setParticipantInfos] = useState<Record<string, SpecialistInfo>>({});
  const [addSpecId, setAddSpecId] = useState('');
  const [addSpecRole, setAddSpecRole] = useState<OrderType>('photo');

  useEffect(() => {
    if (order) {
      setTitle(order.title);
      setDescription(order.description || '');
      setOrderType(order.order_type);
      setDate(parseISO(order.order_date));
      setPrice(order.price != null ? String(order.price) : '');
      setNotes(order.notes || '');
      setEditing(false);
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

  if (!order) return null;

  const handleSave = async () => {
    if (!date) return;
    const success = await onUpdate(order.id, {
      title: title.trim(),
      description: description.trim() || null,
      order_type: orderType,
      order_date: format(date, 'yyyy-MM-dd'),
      price: price ? Number(price) : null,
      notes: notes.trim() || null,
    });
    if (success) setEditing(false);
  };

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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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
                <Label>Ціна (₴)</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Нотатки</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">Зберегти</Button>
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
                <div>
                  <span className="text-muted-foreground">Дата:</span>
                  <span className="ml-2 font-medium">{format(parseISO(order.order_date), 'd MMM yyyy', { locale: uk })}</span>
                </div>
                {order.price != null && (
                  <div>
                    <span className="text-muted-foreground">Ціна:</span>
                    <span className="ml-2 font-semibold text-primary">{order.price} ₴</span>
                  </div>
                )}
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

          {/* Admin actions */}
          {isAdmin && !editing && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Редагувати
                </Button>
                {order.status === 'pending' && (
                  <Button size="sm" onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
                    <Check className="h-3.5 w-3.5 mr-1" /> Підтвердити
                  </Button>
                )}
                {order.status === 'confirmed' && (
                  <Button size="sm" variant="outline" onClick={handleReject}>
                    <X className="h-3.5 w-3.5 mr-1" /> Повернути
                  </Button>
                )}
                {order.status !== 'archived' && (
                  <Button size="sm" variant="secondary" onClick={handleArchive}>
                    <Archive className="h-3.5 w-3.5 mr-1" /> В архів
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
