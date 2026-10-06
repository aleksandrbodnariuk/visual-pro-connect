import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Check, Move, X } from 'lucide-react';
import { orgActions, type Organization } from '@/hooks/orgs/useOrganizations';

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function FlagBanner({ org, canEdit, onChanged }: { org: Organization; canEdit: boolean; onChanged: () => void }) {
  const saved = org.flag_position ?? 50;
  const [editing, setEditing] = useState(false);
  const [pos, setPos] = useState(saved);
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ y: number; start: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  if (!org.flag_url) return null;
  const current = editing ? pos : saved;

  const onDown = (e: React.PointerEvent) => {
    if (!editing) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, start: pos };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !boxRef.current) return;
    const h = boxRef.current.clientHeight || 100;
    // drag down -> show upper part (lower %)
    setPos(clamp(drag.current.start - ((e.clientY - drag.current.y) / h) * 100));
  };
  const onUp = () => { drag.current = null; };

  const save = async () => {
    setSaving(true);
    if (await orgActions.update(org.id, { flag_position: pos } as Partial<Organization>)) { onChanged(); setEditing(false); }
    setSaving(false);
  };

  return (
    <div>
      <div
        ref={boxRef}
        className={`relative w-full h-20 md:h-28 overflow-hidden select-none ${editing ? 'cursor-grab active:cursor-grabbing ring-2 ring-primary' : ''}`}
        style={{ touchAction: editing ? 'none' : undefined }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <img src={org.flag_url} alt={`Прапор ${org.name}`} draggable={false} className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: `center ${current}%` }} />
        {canEdit && !editing && (
          <Button size="sm" variant="secondary" className="absolute top-2 right-2 min-h-[36px] opacity-90" onClick={() => { setPos(saved); setEditing(true); }}>
            <Move className="h-4 w-4 mr-1" /> Змінити позицію
          </Button>
        )}
        {editing && (
          <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-1 text-xs">Перетягніть вгору або вниз</span>
        )}
      </div>
      {editing && (
        <div className="flex flex-wrap items-center gap-3 p-3 border-b bg-muted/40">
          <span className="text-xs text-muted-foreground">Вгору</span>
          <Slider className="flex-1 min-w-[140px]" min={0} max={100} step={1} value={[pos]} onValueChange={(v) => setPos(v[0])} aria-label="Позиція прапора" />
          <span className="text-xs text-muted-foreground">Вниз · {pos}%</span>
          <Button size="sm" className="min-h-[44px]" disabled={saving} onClick={save}><Check className="h-4 w-4 mr-1" />Зберегти</Button>
          <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" />Скасувати</Button>
        </div>
      )}
    </div>
  );
}
