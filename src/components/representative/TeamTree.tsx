import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Loader2, ChevronRight } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  parent_id: string | null;
  full_name: string;
  avatar_url: string;
  level: number;
}

const ROLE_LABELS: Record<string, string> = {
  representative: 'Представник',
  manager: 'Менеджер',
  director: 'Директор',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  director: 'destructive',
  manager: 'default',
  representative: 'secondary',
};

interface TeamTreeProps {
  representativeId: string;
}

export function TeamTree({ representativeId }: TeamTreeProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, [representativeId]);

  const loadTeam = async () => {
    try {
      const { data, error } = await supabase.rpc('get_team_tree', {
        _representative_id: representativeId,
      });

      if (error) throw error;
      setMembers((data as TeamMember[]) || []);
    } catch (err) {
      console.error('Error loading team:', err);
    } finally {
      setLoading(false);
    }
  };

  const level1 = members.filter((m) => m.level === 1);
  const level2 = members.filter((m) => m.level === 2);

  // Group level 2 by parent_id
  const childrenByParent = new Map<string, TeamMember[]>();
  for (const m of level2) {
    const arr = childrenByParent.get(m.parent_id!) || [];
    arr.push(m);
    childrenByParent.set(m.parent_id!, arr);
  }

  const totalCount = members.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Моя команда ({totalCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {level1.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 break-words">
            У вас поки немає залучених представників. Натисніть «Залучити» щоб надіслати запрошення.
          </p>
        ) : (
          <div className="space-y-1">
            {level1.map((member) => {
              const children = childrenByParent.get(member.id) || [];
              return (
                <div key={member.id}>
                  {/* Level 1 member */}
                  <MemberRow member={member} indent={0} hasChildren={children.length > 0} />
                  {/* Level 2 children */}
                  {children.map((child) => (
                    <MemberRow key={child.id} member={child} indent={1} hasChildren={false} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({
  member,
  indent,
  hasChildren,
}: {
  member: TeamMember;
  indent: number;
  hasChildren: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border min-h-[52px]"
      style={{ marginLeft: indent * 28 }}
    >
      {indent > 0 && (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 -ml-1" />
      )}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={member.avatar_url} />
        <AvatarFallback>{(member.full_name || '?')[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.full_name}</p>
        {hasChildren && (
          <p className="text-xs text-muted-foreground">має команду</p>
        )}
      </div>
      <Badge variant={ROLE_VARIANTS[member.role] || 'secondary'} className="shrink-0 text-xs">
        {ROLE_LABELS[member.role] || member.role}
      </Badge>
    </div>
  );
}
