import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  finderRole: string;
  onCreated?: () => void;
}

export function CreateAdOrderDialog({ open, onOpenChange, userId, finderRole, onCreated }: Props) {
  const { toast } = useToast();
  const [advertiserName, setAdvertiserName] = useState('');
  const [advertiserContact, setAdvertiserContact] = useState('');
  const [adPrice, setAdPrice] = useState('');
  const [adDate, setAdDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAdvertiserName(''); setAdvertiserContact(''); setAdPrice('');
    setAdDate(new Date().toISOString().slice(0, 10)); setNotes('');
  };

  const handleSubmit = async () => {
    if (!advertiserName.trim()) {
      toast({ title: 'Вкажіть рекламодавця', variant: 'destructive' });
      return;
    }
    const priceNum = parseFloat(adPrice);
    if (!priceNum || priceNum <= 0) {
      toast({ title: 'Вкажіть коректну ціну реклами', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('ad_orders').insert({
        finder_user_id: userId,
        finder_role: finderRole,
        advertiser_name: advertiserName.trim(),
        advertiser_contact: advertiserContact.trim() || null,
        ad_price: priceNum,
        ad_date: adDate,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Рекламне замовлення створено', description: 'Адміністратор підтвердить виплати після обробки.' });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast({ title: 'Помилка', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Нова реклама</DialogTitle>
          <DialogDescription>
            Заповніть дані рекламодавця. Розподіл виплат: 50% мережа, 30% — ви, 10% — ваш менеджер, 10% — директор.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="adv-name">Рекламодавець *</Label>
            <Input id="adv-name" value={advertiserName} onChange={e => setAdvertiserName(e.target.value)} maxLength={200} placeholder="Назва компанії або ПІБ" />
          </div>
          <div>
            <Label htmlFor="adv-contact">Контакт</Label>
            <Input id="adv-contact" value={advertiserContact} onChange={e => setAdvertiserContact(e.target.value)} maxLength={200} placeholder="Телефон, email або @нік" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ad-price">Ціна реклами (грн) *</Label>
              <Input id="ad-price" type="number" min="0" step="0.01" value={adPrice} onChange={e => setAdPrice(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ad-date">Дата</Label>
              <Input id="ad-date" type="date" value={adDate} onChange={e => setAdDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ad-notes">Нотатки</Label>
            <Textarea id="ad-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} rows={3} placeholder="Деталі домовленості, ресурс розміщення, період показу тощо" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Скасувати</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Збереження...' : 'Створити'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
