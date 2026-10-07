import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Megaphone, UserRound, Pencil, Link2 } from 'lucide-react';
import { HqMemberEditDialog } from './HqMemberEditDialog';
import { partyActions, partyMembersApi, type PartyMember, type HqLevel, type HqMember, type StructureTemplate } from '@/hooks/orgs/useOrganizations';
import { toast } from 'sonner';

interface Props {
  orgId: string;
  hqId: string;
  level: HqLevel;
  templates: StructureTemplate[];
  canEdit: boolean;
}

export function HqTeamPanel({ orgId, hqId, level, templates, canEdit }: Props) {
  const [members, setMembers] = useState<HqMember[]>([]);
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [isAgitator, setIsAgitator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HqMember | null>(null);
  const [registry, setRegistry] = useState<PartyMember[]>([]);
  const [memberId, setMemberId] = useState('');
  useEffect(() => { if (canEdit) partyMembersApi.list(orgId).then(setRegistry); }, [orgId, canEdit]);
  const pickMember = (id: string) => {
    setMemberId(id);
    const m = registry.find((r) => r.id === id);
    if (m) { setFullName(m.full_name); setPhone(m.phone || ''); }
  };

  const template = templates.find((t) => t.level === level);
  const positions = template?.positions ?? [];

  const load = useCallback(async () => {
    setMembers(await partyActions.listHqMembers(hqId));
  }, [hqId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!fullName.trim()) { toast.error('Вкажіть прізвище та ім’я'); return; }
    setSaving(true);
    const ok = await partyActions.saveHqMember(orgId, hqId, {
      full_name: fullName.trim(),
      position: position || null,
      phone,
      is_agitator: isAgitator,
      party_member_id: memberId || null,
    });
    setSaving(false);
    if (ok) { setFullName(''); setPhone(''); setMemberId(''); setIsAgitator(false); load(); }
  };

  const remove = async (id: string) => {
    if (await partyActions.removeHqMember(id)) load();
  };

  const team = members.filter((m) => !m.is_agitator);
  const agitators = members.filter((m) => m.is_agitator);

  return (
    <div className="space-y-4">
      {positions.length > 0 && (
        <Card className="p-3">
          <p className="text-sm font-medium mb-2">Структура за зразком ({positions.length} посад)</p>
          <div className="space-y-1">
            {positions.map((p) => {
              const holders = team.filter((m) => m.position === p);
              return (
                <div key={p} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 py-1.5">
                  <span className="text-muted-foreground">{p}</span>
                  <span className={holders.length ? '' : 'text-destructive text-xs'}>
                    {holders.length ? holders.map((h) => h.full_name).join(', ') : 'вакансія'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {canEdit && (
        <Card className="p-3 space-y-3">
          <p className="text-sm font-medium">Додати людину</p>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={memberId} onChange={(e) => pickMember(e.target.value)}>
            <option value="">— Найманий працівник / не член партії (ввести вручну) —</option>
            {registry.filter((r) => r.status !== 'suspended').map((r) => <option key={r.id} value={r.id}>Член партії: {r.full_name}{r.unit_name ? ` · ${r.unit_name}` : ''}</option>)}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Input placeholder="Прізвище та ім’я" value={fullName} onChange={(e) => { setFullName(e.target.value); setMemberId(''); }} />
            {positions.length > 0 ? (
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="">— посада —</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                <option value="Агітатор">Агітатор</option>
              </select>
            ) : (
              <Input placeholder="Посада" value={position} onChange={(e) => setPosition(e.target.value)} />
            )}
            <Input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isAgitator} onCheckedChange={(v) => setIsAgitator(v === true)} />
                Агітатор
              </label>
              <Button size="sm" onClick={add} disabled={saving}><Plus className="h-4 w-4 mr-1" />Додати</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-3">
          <p className="text-sm font-medium mb-2 flex items-center gap-2"><UserRound className="h-4 w-4" /> Команда штабу ({team.length})</p>
          {team.length === 0 && <p className="text-sm text-muted-foreground">Поки нікого немає</p>}
          <div className="space-y-1">
            {team.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 py-1.5">
                <div className="min-w-0">
                  <p className="truncate flex items-center gap-1">{m.full_name}{m.user_id && <Link2 className="h-3 w-3 text-primary" />}<Badge variant={m.party_member_id ? 'default' : 'outline'} className="ml-1 text-[10px]">{m.party_member_id ? 'член партії' : 'найманий'}</Badge></p>
                  <p className="text-xs text-muted-foreground truncate">{[m.position, m.phone].filter(Boolean).join(' · ')}</p>
                </div>
                {canEdit && <div className="flex shrink-0"><Button size="icon" variant="ghost" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3">
          <p className="text-sm font-medium mb-2 flex items-center gap-2"><Megaphone className="h-4 w-4" /> Агітатори ({agitators.length})</p>
          {agitators.length === 0 && <p className="text-sm text-muted-foreground">Поки нікого немає</p>}
          <div className="space-y-1">
            {agitators.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 py-1.5">
                <div className="min-w-0">
                  <p className="truncate">{m.full_name} <Badge variant="secondary" className="ml-1">агітатор</Badge></p>
                  <p className="text-xs text-muted-foreground truncate">{m.phone}</p>
                </div>
                {canEdit && <div className="flex shrink-0"><Button size="icon" variant="ghost" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <HqMemberEditDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} orgId={orgId} hqId={hqId} member={editing} positions={positions} onSaved={load} />
    </div>
  );
}
