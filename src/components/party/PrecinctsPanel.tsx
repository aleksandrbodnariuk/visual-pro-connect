import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2 } from 'lucide-react';
import { partyActions, type Precinct, type PrecinctMember, type PrecinctRole } from '@/hooks/orgs/useOrganizations';
import { toast } from 'sonner';

interface Props { orgId: string; hqId: string; canEdit: boolean }

function PrecinctPeople({ orgId, precinct, canEdit }: { orgId: string; precinct: Precinct; canEdit: boolean }) {
  const [people, setPeople] = useState<PrecinctMember[]>([]);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<PrecinctRole>('commission');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    setPeople(await partyActions.listPrecinctMembers(precinct.id));
  }, [precinct.id]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!fullName.trim()) { toast.error('Вкажіть прізвище та ім’я'); return; }
    if (await partyActions.savePrecinctMember(orgId, precinct.id, { full_name: fullName.trim(), role, position, phone })) {
      setFullName(''); setPosition(''); setPhone(''); load();
    }
  };

  const commission = people.filter((p) => p.role === 'commission');
  const observers = people.filter((p) => p.role === 'observer');

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <Input placeholder="Прізвище та ім’я" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as PrecinctRole)}>
            <option value="commission">Член комісії</option>
            <option value="observer">Спостерігач</option>
          </select>
          <Input placeholder="Посада в комісії" value={position} onChange={(e) => setPosition(e.target.value)} />
          <Input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Додати</Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[{ title: `Члени комісії (${commission.length})`, list: commission }, { title: `Спостерігачі (${observers.length})`, list: observers }].map((b) => (
          <div key={b.title}>
            <p className="text-sm font-medium mb-1">{b.title}</p>
            {b.list.length === 0 && <p className="text-xs text-muted-foreground">Немає записів</p>}
            {b.list.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 py-1.5">
                <div className="min-w-0">
                  <p className="truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{[p.position, p.phone].filter(Boolean).join(' · ')}</p>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={async () => { if (await partyActions.removePrecinctMember(p.id)) load(); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrecinctsPanel({ orgId, hqId, canEdit }: Props) {
  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [voters, setVoters] = useState('');

  const load = useCallback(async () => { setPrecincts(await partyActions.listPrecincts(hqId)); }, [hqId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!number.trim()) { toast.error('Вкажіть номер дільниці'); return; }
    if (await partyActions.savePrecinct(orgId, hqId, { number: number.trim(), name, address, voters_count: Number(voters) || 0 })) {
      setNumber(''); setName(''); setAddress(''); setVoters(''); load();
    }
  };

  const totalVoters = precincts.reduce((s, p) => s + (p.voters_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">Дільниць: {precincts.length}</Badge>
        <Badge variant="secondary">Виборців: {totalVoters.toLocaleString('uk-UA')}</Badge>
      </div>

      {canEdit && (
        <Card className="p-3">
          <p className="text-sm font-medium mb-2">Додати дільницю</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Input placeholder="№" value={number} onChange={(e) => setNumber(e.target.value)} />
            <Input placeholder="Назва" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Адреса" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input placeholder="Виборців" inputMode="numeric" value={voters} onChange={(e) => setVoters(e.target.value)} />
            <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Додати</Button>
          </div>
        </Card>
      )}

      {precincts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Дільниць ще немає</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {precincts.map((p) => (
            <AccordionItem key={p.id} value={p.id}>
              <AccordionTrigger>
                <div className="flex flex-wrap items-center gap-2 text-left">
                  <span className="font-medium">Дільниця №{p.number}</span>
                  {p.name && <span className="text-sm text-muted-foreground">{p.name}</span>}
                  <Badge variant="outline">{(p.voters_count || 0).toLocaleString('uk-UA')} виборців</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {p.address && <p className="text-sm text-muted-foreground">{p.address}</p>}
                  <PrecinctPeople orgId={orgId} precinct={p} canEdit={canEdit} />
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={async () => { if (await partyActions.removePrecinct(p.id)) load(); }}>
                      <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Видалити дільницю
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
