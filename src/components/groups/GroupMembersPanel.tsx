import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Check, Shield, ShieldOff, UserMinus } from 'lucide-react';
import { groupActions, type GroupMemberWithProfile } from '@/hooks/groups/useGroups';

interface Props {
  members: GroupMemberWithProfile[];
  isAdmin: boolean;
  currentUserId?: string;
  onChanged: () => void;
}

const roleLabel: Record<string, string> = {
  owner: 'Власник',
  admin: 'Адміністратор',
  member: 'Учасник',
};

export function GroupMembersPanel({ members, isAdmin, currentUserId, onChanged }: Props) {
  const pending = members.filter((m) => m.status === 'pending');
  const approved = members.filter((m) => m.status === 'approved');

  const Row = ({ m }: { m: GroupMemberWithProfile }) => (
    <div className="flex items-center gap-2 py-2 border-b last:border-b-0">
      <Link to={`/profile/${m.user_id}`} className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={m.avatar_url || undefined} />
          <AvatarFallback>{m.full_name[0]}</AvatarFallback>
        </Avatar>
        <span className="text-sm truncate">{m.full_name}</span>
      </Link>
      <Badge variant="secondary" className="text-[10px]">{roleLabel[m.role]}</Badge>
      {isAdmin && m.role !== 'owner' && m.user_id !== currentUserId && (
        <div className="flex items-center gap-1">
          {m.status === 'pending' && (
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Схвалити"
              onClick={async () => { await groupActions.setStatus(m.id, 'approved'); onChanged(); }}>
              <Check className="h-4 w-4" />
            </Button>
          )}
          {m.status === 'approved' && (
            <Button size="icon" variant="ghost" className="h-8 w-8"
              title={m.role === 'admin' ? 'Зняти права адміністратора' : 'Призначити адміністратором'}
              onClick={async () => { await groupActions.setRole(m.id, m.role === 'admin' ? 'member' : 'admin'); onChanged(); }}>
              {m.role === 'admin' ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Видалити з групи"
            onClick={async () => { await groupActions.removeMember(m.id); onChanged(); }}>
            <UserMinus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {isAdmin && pending.length > 0 && (
        <div className="creative-card p-3">
          <h3 className="font-semibold text-sm mb-2">Заявки на вступ ({pending.length})</h3>
          {pending.map((m) => <Row key={m.id} m={m} />)}
        </div>
      )}
      <div className="creative-card p-3">
        <h3 className="font-semibold text-sm mb-2">Учасники ({approved.length})</h3>
        {approved.map((m) => <Row key={m.id} m={m} />)}
      </div>
    </div>
  );
}
