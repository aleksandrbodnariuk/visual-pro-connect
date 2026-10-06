import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ArrowUp } from 'lucide-react';
import { HQ_LEVELS, partyActions, type HqLevel, type StructureTemplate } from '@/hooks/orgs/useOrganizations';

const DEFAULTS: Record<HqLevel, string[]> = {
  central: ['Керівник штабу', 'Заступник керівника', 'Юрист', 'Фінансовий менеджер', 'Прес-секретар', 'Координатор регіонів', 'Координатор спостерігачів', 'IT / аналітика'],
  oblast: ['Керівник обласного штабу', 'Заступник', 'Юрист', 'Координатор округів', 'Координатор спостерігачів', 'Медіа-менеджер'],
  okrug: ['Керівник окружного штабу', 'Заступник', 'Юрист', 'Координатор дільниць', 'Координатор агітаторів'],
  city: ['Голова міської організації', 'Заступник', 'Секретар', 'Координатор агітаторів'],
  otg: ['Голова організації ОТГ', 'Секретар', 'Координатор агітаторів'],
  village: ['Голова сільської організації', 'Секретар'],
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  templates: StructureTemplate[];
  onSaved: () => void;
}

export function StructureTemplateDialog({ open, onOpenChange, orgId, templates, onSaved }: Props) {
  const [level, setLevel] = useState<HqLevel>('central');
  const [positions, setPositions] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    const t = templates.find((x) => x.level === level);
    setPositions(t ? t.positions : DEFAULTS[level]);
  }, [open, level, templates]);

  const add = () => { if (draft.trim()) { setPositions([...positions, draft.trim()]); setDraft(''); } };
  const up = (i: number) => { if (i === 0) return; const n = [...positions]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setPositions(n); };

  const save = async () => {
    const clean = positions.map((p) => p.trim()).filter(Boolean);
    if (await partyActions.saveTemplate(orgId, level, clean)) onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Структура штабів (зразок для рівня)</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Структура діє для всіх штабів обраного рівня однаково.</p>
        <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={level} onChange={(e) => setLevel(e.target.value as HqLevel)}>
          {HQ_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.plural}</option>)}
        </select>
        <div className="space-y-1">
          {positions.map((p, i) => (
            <div key={i} className="flex items-center gap-2 border rounded-md px-2 py-1">
              <Input
                className="flex-1 h-9 text-sm border-transparent bg-transparent focus-visible:border-input"
                value={p}
                aria-label="Назва посади"
                onChange={(e) => { const n = [...positions]; n[i] = e.target.value; setPositions(n); }}
                onBlur={() => { if (!positions[i]?.trim()) setPositions(positions.filter((_, j) => j !== i)); }}
              />
              <Button size="icon" variant="ghost" onClick={() => up(i)}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setPositions(positions.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Нова посада" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Закрити</Button>
          <Button onClick={save}>Зберегти структуру</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
