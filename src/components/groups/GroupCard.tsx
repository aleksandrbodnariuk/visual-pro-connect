import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Globe, Users } from 'lucide-react';
import type { Group, GroupMembership } from '@/hooks/groups/useGroups';

interface Props {
  group: Group;
  membership?: GroupMembership | null;
  onJoin?: (g: Group) => void;
}

export function GroupCard({ group, membership, onJoin }: Props) {
  return (
    <div className="creative-card p-4 flex flex-col gap-3">
      <Link to={`/groups/${group.id}`} className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border">
          <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
          <AvatarFallback><Users className="h-5 w-5" /></AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-semibold truncate">{group.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {group.privacy === 'private' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            {group.privacy === 'private' ? 'Закрита група' : 'Відкрита група'}
          </div>
        </div>
      </Link>
      {group.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
      )}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {membership ? (
          <Badge variant={membership.status === 'pending' ? 'outline' : 'secondary'}>
            {membership.status === 'pending'
              ? 'Заявка на розгляді'
              : membership.role === 'member' ? 'Ви учасник' : 'Адміністрація'}
          </Badge>
        ) : <span />}
        {!membership && onJoin && (
          <Button size="sm" onClick={() => onJoin(group)}>
            {group.privacy === 'private' ? 'Подати заявку' : 'Приєднатися'}
          </Button>
        )}
        {membership && (
          <Button size="sm" variant="outline" asChild><Link to={`/groups/${group.id}`}>Відкрити</Link></Button>
        )}
      </div>
    </div>
  );
}
