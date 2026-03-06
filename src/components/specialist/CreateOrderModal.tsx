
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OrderType, ORDER_TYPE_LABELS } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    order_type: string;
    order_date: string;
    notes?: string;
  }) => Promise<any>;
  initialDate?: Date;
}

export function CreateOrderModal({ open, onOpenChange, onSubmit, initialDate }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('photo');
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;
    setSubmitting(true);
    const result = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      order_type: orderType,
      order_date: format(date, 'yyyy-MM-dd'),
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (result) {
      setTitle('');
      setDescription('');
      setOrderType('photo');
      setDate(undefined);
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Створити бронювання</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Назва *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Назва замовлення" />
          </div>
          <div>
            <Label>Опис</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Опис замовлення" rows={2} />
          </div>
          <div>
            <Label>Тип замовлення</Label>
            <Select value={orderType} onValueChange={v => setOrderType(v as OrderType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ORDER_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Дата *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left', !date && 'text-muted-foreground')}>
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
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Додаткові нотатки" rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={!title.trim() || !date || submitting} className="w-full">
            {submitting ? 'Створення...' : 'Створити бронювання'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
