import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, LayoutList, Pencil, Plus, Trash2, MapPin, Phone, MessagesSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HqChatsPanel } from './HqChatsPanel';
import { HqManagersPanel } from './HqManagersPanel';
import {
  HQ_LEVELS, levelLabel, levelPlural, partyActions, partyExtra,
  type HqLevel, type PartyHq, type StructureTemplate,
} from '@/hooks/orgs/useOrganizations';
import { HqDialog } from './HqDialog';
import { HqTeamPanel } from './HqTeamPanel';
import { PrecinctsPanel } from './PrecinctsPanel';
import { StructureTemplateDialog } from './StructureTemplateDialog';

const PARENT_LEVEL: Record<HqLevel, HqLevel | null> = {
  central: null, oblast: 'central', okrug: 'oblast', city: 'okrug', otg: 'okrug', village: 'otg',
};

export function PartySection({ orgId, canEdit: isAdmin }: { orgId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [managed, setManaged] = useState<Set<string>>(new Set());
  const [hqs, setHqs] = useState<PartyHq[]>([]);
  const [templates, setTemplates] = useState<StructureTemplate[]>([]);
  const [level, setLevel] = useState<HqLevel>('central');
  const [selected, setSelected] = useState<PartyHq | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PartyHq | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showGeneral, setShowGeneral] = useState(false);

  const load = useCallback(async () => {
    const [h, t, m] = await Promise.all([partyActions.listHqs(orgId), partyActions.listTemplates(orgId), partyExtra.listManagers(orgId)]);
    setHqs(h); setTemplates(t);
    setManaged(new Set(m.filter((x) => x.user_id === user?.id).map((x) => x.hq_id)));
    setSelected((s) => (s ? h.find((x) => x.id === s.id) || null : null));
  }, [orgId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    hqs.forEach((h) => { c[h.level] = (c[h.level] || 0) + 1; });
    return c;
  }, [hqs]);

  const parentLevel = PARENT_LEVEL[level];
  const parents = parentLevel ? hqs.filter((h) => h.level === parentLevel) : [];
  const byId = useMemo(() => new Map(hqs.map((h) => [h.id, h])), [hqs]);
  const canManage = (hq: PartyHq | null | undefined): boolean => {
    if (isAdmin) return true;
    let cur = hq; let guard = 0;
    while (cur && guard++ < 10) { if (managed.has(cur.id)) return true; cur = cur.parent_id ? byId.get(cur.parent_id) : undefined; }
    return false;
  };
  const canEdit = isAdmin;
  const list = hqs.filter((h) => h.level === level && (!query || `${h.name} ${h.region || ''}`.toLowerCase().includes(query.toLowerCase())));

  if (selected) {
    const parent = selected.parent_id ? byId.get(selected.parent_id) : null;
    const children = hqs.filter((h) => h.parent_id === selected.id);
    const canEditHq = canManage(selected);
    const childLevel = (HQ_LEVELS.find((l) => PARENT_LEVEL[l.value] === selected.level)?.value) || null;
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4 mr-1" /> До списку</Button>
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Badge variant="secondary" className="mb-1">{levelLabel(selected.level)}</Badge>
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
                {selected.region && <p>{selected.region}</p>}
                {selected.address && <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selected.address}</p>}
                {selected.phone && <p className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.phone}</p>}
                {parent && <p>Підпорядковується: <button className="underline" onClick={() => setSelected(parent)}>{parent.name}</button></p>}
              </div>
            </div>
            {canEditHq && (
              <Button size="sm" variant="outline" onClick={() => { setLevel(selected.level); setEditing(selected); setDialogOpen(true); }}>
                <Pencil className="h-4 w-4 mr-1" /> Редагувати
              </Button>
            )}
          </div>
          {selected.notes && <p className="text-sm mt-3 whitespace-pre-wrap">{selected.notes}</p>}
        </Card>

        <Tabs defaultValue="team">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="team">Команда</TabsTrigger>
            <TabsTrigger value="precincts">Дільниці</TabsTrigger>
            <TabsTrigger value="children">Підлеглі організації ({children.length})</TabsTrigger>
            <TabsTrigger value="chats"><MessagesSquare className="h-4 w-4 mr-1" />Чати</TabsTrigger>
            <TabsTrigger value="managers">Керівники</TabsTrigger>
          </TabsList>
          <TabsContent value="team">
            <HqTeamPanel orgId={orgId} hqId={selected.id} level={selected.level} templates={templates} canEdit={canEditHq} />
          </TabsContent>
          <TabsContent value="precincts">
            <PrecinctsPanel orgId={orgId} hqId={selected.id} canEdit={canEditHq} />
          </TabsContent>
          <TabsContent value="chats"><HqChatsPanel orgId={orgId} hqId={selected.id} hqName={selected.name} /></TabsContent>
          <TabsContent value="managers"><HqManagersPanel orgId={orgId} hqId={selected.id} isAdmin={isAdmin} onChanged={load} /></TabsContent>
          <TabsContent value="children">
            {canEditHq && childLevel && (
              <Button size="sm" className="mb-3" onClick={() => { setLevel(childLevel); setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Додати: {levelLabel(childLevel)}
              </Button>
            )}
            {children.length === 0 ? <p className="text-sm text-muted-foreground">Немає підлеглих організацій</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {children.map((c) => (
                  <Card key={c.id} className="p-3 cursor-pointer hover:border-primary transition-colors" onClick={() => setSelected(c)}>
                    <Badge variant="outline" className="mb-1">{levelLabel(c.level)}</Badge>
                    <p className="font-medium">{c.name}</p>
                    {c.region && <p className="text-xs text-muted-foreground">{c.region}</p>}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <HqDialog open={dialogOpen} onOpenChange={setDialogOpen} orgId={orgId} level={level} parents={parents} editing={editing} onSaved={load} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-4 xl:col-span-3">
        <Card className="p-2">
          <div className="flex md:flex-col gap-1 overflow-x-auto">
            {HQ_LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm whitespace-nowrap min-h-[44px] transition-colors ${level === l.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{l.plural}</span>
                <span className="text-xs opacity-80">{counts[l.value] || 0}</span>
              </button>
            ))}
          </div>
        </Card>
        <Button variant={showGeneral ? 'default' : 'outline'} className="w-full mt-2 min-h-[44px]" onClick={() => setShowGeneral((v) => !v)}>
          <MessagesSquare className="h-4 w-4 mr-1" /> {showGeneral ? 'Сховати чат' : 'Загальнопартійний чат'}
        </Button>
        {canEdit && (
          <Button variant="outline" className="w-full mt-2" onClick={() => setTplOpen(true)}>
            <LayoutList className="h-4 w-4 mr-1" /> Структура посад
          </Button>
        )}
      </div>

      <div className="col-span-12 md:col-span-8 xl:col-span-9 space-y-3">
        {showGeneral && <HqChatsPanel orgId={orgId} hqId={null} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{levelPlural(level)}</h2>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Додати
            </Button>
          )}
        </div>
        <Input placeholder="Пошук за назвою чи регіоном…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Тут ще нічого немає</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
            {list.map((h) => {
              const parent = h.parent_id ? byId.get(h.parent_id) : null;
              return (
                <Card key={h.id} className="p-3 cursor-pointer hover:border-primary transition-colors" onClick={() => setSelected(h)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{h.name}</p>
                      {h.region && <p className="text-xs text-muted-foreground truncate">{h.region}</p>}
                      {parent && <p className="text-xs text-muted-foreground truncate">↑ {parent.name}</p>}
                    </div>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Видалити «${h.name}»?`) && await partyActions.removeHq(h.id)) load();
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <HqDialog open={dialogOpen} onOpenChange={setDialogOpen} orgId={orgId} level={level} parents={parents} editing={editing} onSaved={load} />
      <StructureTemplateDialog open={tplOpen} onOpenChange={setTplOpen} orgId={orgId} templates={templates} onSaved={load} />
    </div>
  );
}
