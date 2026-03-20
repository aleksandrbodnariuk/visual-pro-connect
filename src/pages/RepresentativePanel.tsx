import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { InviteFriendDialog } from '@/components/representative/InviteFriendDialog';
import { InvitesList } from '@/components/representative/InvitesList';
import { TeamTree } from '@/components/representative/TeamTree';

interface RepresentativeRecord {
  id: string;
  user_id: string;
  role: string;
  parent_id: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  representative: 'Представник',
  manager: 'Менеджер',
  director: 'Директор',
};

export default function RepresentativePanel() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [repRecord, setRepRecord] = useState<RepresentativeRecord | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRepresentative = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('representatives')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRepRecord(data as RepresentativeRecord);
        setHasAccess(true);
      } else {
        // Check for pending invites
        const { data: invites } = await supabase
          .from('representative_invites')
          .select('*')
          .eq('invited_user_id', user.id)
          .eq('status', 'pending');

        if (invites && invites.length > 0) {
          setHasAccess(true); // show page with pending invites
        } else {
          setHasAccess(false);
        }
      }
    } catch (err) {
      console.error('Error loading representative data:', err);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) loadRepresentative();
  }, [user, authLoading, navigate, loadRepresentative]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (hasAccess === false) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Доступ обмежено</h2>
              <p className="text-sm text-muted-foreground">
                Ви не є представником. Зверніться до вашого менеджера або директора для отримання запрошення.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-16 sm:pt-20 pb-20 px-3 sm:px-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Кабінет представника</h1>
            {repRecord && (
              <Badge variant="secondary" className="mt-1">
                {ROLE_LABELS[repRecord.role] || repRecord.role}
              </Badge>
            )}
          </div>
          {repRecord && (
            <Button onClick={() => setInviteOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Залучити друга
            </Button>
          )}
        </div>

        {/* Pending invites for this user (if not yet a representative) */}
        {!repRecord && (
          <InvitesList userId={user!.id} onAccepted={loadRepresentative} />
        )}

        {/* Representative content */}
        {repRecord && (
          <div className="space-y-6">
            <InvitesList userId={user!.id} onAccepted={loadRepresentative} />
            <TeamTree representativeId={repRecord.id} />
          </div>
        )}
      </div>

      {repRecord && (
        <InviteFriendDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          representativeId={repRecord.id}
          onInviteSent={loadRepresentative}
        />
      )}
    </>
  );
}
