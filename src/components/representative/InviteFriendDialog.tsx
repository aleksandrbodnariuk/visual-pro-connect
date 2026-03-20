import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representativeId: string;
  onInviteSent: () => void;
}

interface UserResult {
  id: string;
  full_name: string;
  avatar_url: string;
}

export function InviteFriendDialog({ open, onOpenChange, representativeId, onInviteSent }: InviteFriendDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_users_public', {
        search_term: searchTerm.trim()
      });
      if (error) throw error;
      setResults((data || []) as UserResult[]);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Помилка пошуку');
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      // Check if user is already a representative
      const { data: existing } = await supabase
        .from('representatives')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        toast.error('Цей користувач вже є представником');
        return;
      }

      // Check for existing pending invite
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
      setResults([]);
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

        <div className="flex gap-2">
          <Input
            placeholder="Пошук за ім'ям..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon" variant="outline" disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {results.length === 0 && !searching && searchTerm && (
            <p className="text-sm text-muted-foreground text-center py-4">Нікого не знайдено</p>
          )}
          {results.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{(user.full_name || '?')[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.full_name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleInvite(user.id)}
                disabled={inviting === user.id}
              >
                {inviting === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
