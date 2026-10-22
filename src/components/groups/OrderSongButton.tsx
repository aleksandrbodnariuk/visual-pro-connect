import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const OPTIONS = [
  { label: 'Замовити пісню', topic: 'Хочу замовити пісню-привітання' },
  { label: 'Дізнатися ціну', topic: 'Скільки коштує пісня-привітання?' },
  { label: 'Інше питання', topic: 'Маю питання щодо пісні-привітання' },
];

export function OrderSongButton({ ownerId, groupName }: { ownerId: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const go = (topic: string) => {
    if (!user?.id) { toast.error('Увійдіть у систему, щоб написати'); return; }
    if (user.id === ownerId) { toast.info('Це ваша група — замовлення надходитимуть вам у повідомлення'); return; }
    navigate(`/messages?to=${ownerId}&topic=${encodeURIComponent(`${topic} (група «${groupName}»)`)}`);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="min-h-[44px] sm:min-h-0">
        <Music className="h-4 w-4 mr-1" /> Замовити пісню
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Пісня для привітання</DialogTitle>
            <DialogDescription>Оберіть, що вас цікавить — відкриється чат з автором.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {OPTIONS.map((o) => (
              <Button key={o.label} variant="outline" className="min-h-[44px]" onClick={() => go(o.topic)}>
                {o.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
