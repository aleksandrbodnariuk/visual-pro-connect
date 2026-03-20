import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Loader2 } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  parent_id: string | null;
  full_name: string;
  avatar_url: string;
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
      // Get all representatives where parent_id = this representative
      const { data: children, error } = await supabase
        .from('representatives')
        .select('*')
        .eq('parent_id', representativeId);

      if (error) throw error;

      if (children && children.length > 0) {
        const userIds = children.map(c => c.user_id);
        const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', {
          _ids: userIds
        });

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        const enriched: TeamMember[] = children.map(c => {
          const profile = profileMap.get(c.user_id);
          return {
            ...c,
            full_name: profile?.full_name || 'Невідомий',
            avatar_url: profile?.avatar_url || '',
          };
        });

        setMembers(enriched);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Error loading team:', err);
    } finally {
      setLoading(false);
    }
  };

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
          Моя команда ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            У вас поки немає залучених представників. Натисніть «Залучити друга» щоб надіслати запрошення.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>{(member.full_name || '?')[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.full_name}</p>
                </div>
                <Badge variant={ROLE_VARIANTS[member.role] || 'secondary'}>
                  {ROLE_LABELS[member.role] || member.role}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
