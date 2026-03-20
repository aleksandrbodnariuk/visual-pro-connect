import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, UserPlus, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representativeId: string;
  onInviteSent: () => void;
}

interface FriendItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function InviteFriendDialog({ open, onOpenChange, representativeId, onInviteSent }: InviteFriendDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (open && authUser?.id) {
      loadFriends();
    }
  }, [open, authUser?.id]);

  const loadFriends = async () => {
    if (!authUser?.id) return;
    setLoading(true);
    try {
      // Get accepted friend requests where current user is sender or receiver
      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`);

      if (error) throw error;

      const friendIds = (requests || []).map(r =>
        r.sender_id === authUser.id ? r.receiver_id : r.sender_id
      );

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      // Get profiles
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', {
        _ids: friendIds
      });

      setFriends((profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Без імені',
        avatar_url: p.avatar_url,
      })));
    } catch (err) {
      console.error('Load friends error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return friends;
    const term = searchTerm.toLowerCase();
    return friends.filter(f => f.full_name.toLowerCase().includes(term));
  }, [friends, searchTerm]);

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      const { data: existing } = await supabase
        .from('representatives')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        toast.error('Цей користувач вже є представником');
        return;
      }

      const { data: existingInvite } = await supabase
        .from('representative_invites')
        .select('id')
        .eq('inviter_id', representativeId)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        toast.error('Запрошення вже надіслано');
        return;
      }

      const { error } = await supabase
        .from('representative_invites')
        .insert({
          inviter_id: representativeId,
          invited_user_id: userId,
        });

      if (error) throw error;

      toast.success('Запрошення надіслано!');
      onInviteSent();
      onOpenChange(false);
      setSearchTerm('');
    } catch (err: any) {
      console.error('Invite error:', err);
      toast.error(err.message || 'Помилка при надсиланні запрошення');
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Залучити друга</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук серед друзів..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1 -webkit-overflow-scrolling-touch">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {friends.length === 0 ? 'У вас поки немає друзів' : 'Нікого не знайдено'}
              </p>
            </div>
          ) : (
            filtered.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>{(friend.full_name || '?')[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{friend.full_name}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleInvite(friend.id)}
                  disabled={inviting === friend.id}
                  className="min-h-[44px] min-w-[44px] shrink-0 ml-2"
                >
                  {inviting === friend.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
