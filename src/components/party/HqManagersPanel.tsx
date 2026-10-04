import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, UserCog } from 'lucide-react';
import { partyExtra } from '@/hooks/orgs/useOrganizations';
import { UserPicker, useProfiles } from './UserPicker';

export function HqManagersPanel({ orgId, hqId, isAdmin, onChanged }: { orgId: string; hqId: string; isAdmin: boolean; onChanged: () => void }) {
  const profiles = useProfiles();
  const [list, setList] = useState<{ id: string; hq_id: string; user_id: string }[]>([]);
  const load = useCallback(async () => setList((await partyExtra.listManagers(orgId)).filter((m) => m.hq_id === hqId)), [orgId, hqId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <Card className="p-3 text-sm text-muted-foreground">
        Керівник штабу може сам редагувати цей штаб, його команду, дільниці, протоколи та всі підлеглі штаби.
      </Card>
      {isAdmin && (
        <Card className="p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2"><UserCog className="h-4 w-4" /> Призначити керівника</p>
          <UserPicker exclude={list.map((m) => m.user_id)} actionLabel="Призначити"
            onPick={async (p) => { if (await partyExtra.addManager(orgId, hqId, p.id)) { load(); onChanged(); } }} />
        </Card>
      )}
      <Card className="p-3">
        <p className="text-sm font-medium mb-2">Керівники ({list.length})</p>
        {list.length === 0 && <p className="text-sm text-muted-foreground">Не призначено</p>}
        {list.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
            <span>{profiles.find((p) => p.id === m.user_id)?.full_name || 'Користувач'}</span>
            {isAdmin && <Button size="icon" variant="ghost" onClick={async () => { if (await partyExtra.removeManager(m.id)) { load(); onChanged(); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          </div>
        ))}
      </Card>
    </div>
  );
}
