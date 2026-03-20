import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Loader2, Mail } from 'lucide-react';

interface Invite {
  id: string;
  inviter_id: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  inviter_name?: string;
}

interface InvitesListProps {
  userId: string;
  onAccepted: () => void;
}

export function InvitesList({ userId, onAccepted }: InvitesListProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, [userId]);

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('representative_invites')
        .select('*')
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const inviterIds = data.map(i => i.inviter_id);
        const { data: reps } = await supabase
          .from('representatives')
          .select('id, user_id')
          .in('id', inviterIds);

        const userIds = (reps || []).map(r => r.user_id);
        const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', {
          _ids: userIds
        });

        const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
        const repUserMap = new Map((reps || []).map(r => [r.id, r.user_id]));

        const enriched = data.map(invite => ({
          ...invite,
          inviter_name: profileMap.get(repUserMap.get(invite.inviter_id) || '') || 'Невідомий',
        }));
        setInvites(enriched);
      } else {
        setInvites([]);
      }
    } catch (err) {
      console.error('Error loading invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    setAccepting(inviteId);
    try {
      const { error } = await supabase.rpc('accept_representative_invite', {
        _invite_id: inviteId,
      });

      if (error) throw error;

      toast.success('Запрошення прийнято! Ви тепер представник.');
      onAccepted();
    } catch (err: any) {
      console.error('Accept error:', err);
      toast.error(err.message || 'Помилка при прийнятті запрошення');
    } finally {
      setAccepting(null);
    }
  };

  if (loading) return null;
  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Запрошення
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => (
          <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border">
            <div className="min-w-0">
              <p className="text-sm font-medium break-words">
                {invite.inviter_name} запрошує вас стати представником
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(invite.created_at).toLocaleDateString('uk-UA')}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleAccept(invite.id)}
              disabled={accepting === invite.id}
              className="min-h-[44px] shrink-0 self-end sm:self-center"
            >
              {accepting === invite.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Прийняти
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
