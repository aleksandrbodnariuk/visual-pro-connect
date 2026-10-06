import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MessageList } from '@/components/messages/MessageList';
import { MessageInput } from '@/components/messages/MessageInput';
import { MessagesService, type Message } from '@/components/messages/MessagesService';
import type { PollDraft } from '@/components/messages/CreatePollDialog';

/** Вбудований чат однієї бесіди — без переходу на сторінку «Повідомлення». */
export function EmbeddedConversation({ conversationId, title, onBack }: { conversationId: string; title: string; onBack?: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const list = await MessagesService.loadConversationMessages(conversationId, user.id);
    setMessages(list);
    setLoading(false);
    if (await MessagesService.markMessagesAsRead(user.id, conversationId)) window.dispatchEvent(new CustomEvent('messages-read'));
  }, [conversationId, user?.id]);

  useEffect(() => { setLoading(true); setMessages([]); reload(); }, [reload]);

  useEffect(() => {
    const ch = supabase
      .channel(`party-conv-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(reload, 150);
      })
      .subscribe();
    return () => { if (timer.current) window.clearTimeout(timer.current); supabase.removeChannel(ch); };
  }, [conversationId, reload]);

  const send = async (text: string, url?: string, type?: string) => {
    if (!user) return;
    const { success, newMessage } = await MessagesService.sendMessage(user, conversationId, text, url, type);
    if (success && newMessage) setMessages((m) => [...m, newMessage]);
  };

  const createPoll = async (draft: PollDraft) => {
    if (!user) return;
    try {
      const { data: poll, error } = await supabase.from('polls').insert({
        conversation_id: conversationId, created_by: user.id, question: draft.question,
        allow_multiple: draft.allowMultiple, is_anonymous: draft.isAnonymous, closes_at: draft.closesAt,
      }).select('id').single();
      if (error || !poll) throw error || new Error('Не вдалося створити опитування');
      const { error: oe } = await supabase.from('poll_options').insert(draft.options.map((t, i) => ({ poll_id: poll.id, text: t, position: i })));
      if (oe) throw oe;
      const { success, newMessage } = await MessagesService.sendMessage(user, conversationId, draft.question, poll.id, 'poll');
      if (!success || !newMessage) throw new Error('Не вдалося надіслати опитування');
      await supabase.from('polls').update({ message_id: newMessage.id }).eq('id', poll.id);
      setMessages((m) => [...m, newMessage]);
      toast.success('Опитування створено');
    } catch (e: any) {
      toast.error(e?.message || 'Не вдалося створити опитування');
    }
  };

  const edit = async (id: string, text: string) => {
    if (await MessagesService.editMessage(id, text)) setMessages((m) => m.map((x) => (x.id === id ? { ...x, text, isEdited: true } : x)));
  };
  const remove = async (id: string) => {
    if (await MessagesService.deleteMessage(id)) setMessages((m) => m.filter((x) => x.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b p-2 min-h-[52px]">
        {onBack && (
          <Button variant="ghost" size="sm" className="md:hidden h-11" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Назад
          </Button>
        )}
        <p className="font-semibold truncate">{title}</p>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Завантаження повідомлень…</div>
      ) : (
        <MessageList key={conversationId} messages={messages} emptyStateMessage="Поки що немає повідомлень. Напишіть першим!" onEditMessage={edit} onDeleteMessage={remove} isGroup />
      )}
      <MessageInput onSendMessage={send} onCreatePoll={createPoll} />
    </div>
  );
}
