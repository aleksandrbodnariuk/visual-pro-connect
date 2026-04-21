import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateReservation } from '@/hooks/marketplace/useMarketplaceReservations';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listingId: string;
  sellerId: string;
  listingTitle: string;
}

export function ReserveDialog({ open, onOpenChange, listingId, sellerId, listingTitle }: Props) {
  const [note, setNote] = useState('');
  const create = useCreateReservation();

  const submit = () => {
    create.mutate(
      { listing_id: listingId, seller_id: sellerId, buyer_note: note.trim() || undefined },
      {
        onSuccess: () => {
          setNote('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Зарезервувати оголошення</DialogTitle>
          <DialogDescription>«{listingTitle}»</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Повідомлення продавцю (необов'язково)</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="Уточніть деталі: коли зручно забрати, спосіб оплати тощо"
            rows={4}
          />
          <div className="text-xs text-muted-foreground text-right">{note.length}/500</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Надсилаємо...' : 'Надіслати запит'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
