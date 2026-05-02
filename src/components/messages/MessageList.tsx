import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { MessageActions } from "./MessageActions";
import { MessageReactionPicker } from "./MessageReactionPicker";
import { MessageReactions } from "./MessageReactions";
import { supabase } from "@/integrations/supabase/client";
import { CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSender: boolean;
  isEdited?: boolean;
  editedAt?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  read?: boolean;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  systemEvent?: any;
}

interface ReactionData {
  emoji: string;
  users: string[];
  isOwn: boolean;
}

function renderSystemEvent(event: any, fallbackText?: string): string {
  if (!event) return fallbackText || '';
  switch (event.type) {
    case 'group_created':
      return event.title ? `Створено групу «${event.title}»` : 'Групу створено';
    case 'member_added':
      return event.name ? `${event.name} приєднався(лась) до групи` : 'Учасник доданий';
    case 'member_removed':
      return event.name ? `${event.name} був(ла) видалений(а) з групи` : 'Учасник видалений';
    case 'member_left':
      return event.name ? `${event.name} покинув(ла) групу` : 'Учасник покинув групу';
    case 'title_changed':
      return event.title ? `Назву групи змінено на «${event.title}»` : 'Назву групи змінено';
    case 'avatar_updated':
      return 'Логотип групи оновлено';
    case 'rules_updated':
      return 'Правила групи оновлено';
    case 'role_changed':
      return event.new_role === 'admin'
        ? 'Учасника призначено співвласником/модератором'
        : 'Учасника знижено до звичайного';
    default:
      return fallbackText || 'Системна подія';
  }
}

interface MessageListProps {
  messages: Message[];
  emptyStateMessage?: ReactNode;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  recipientAvatarUrl?: string;
  isGroup?: boolean;
}

export function MessageList({ 
  messages, 
  emptyStateMessage,
  onEditMessage,
  onDeleteMessage,
  recipientAvatarUrl,
  isGroup
}: MessageListProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionData[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id || null);
    });
  }, []);

  // Fetch reactions for visible messages
  const fetchReactions = useCallback(async () => {
    if (messages.length === 0 || !currentUserId) return;
    
    const messageIds = messages.map(m => m.id);
    
    const { data, error } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, reaction_type')
      .in('message_id', messageIds);

    if (error || !data) return;

    const grouped: Record<string, ReactionData[]> = {};
    
    // Group by message, then by emoji
    const byMessage: Record<string, Record<string, string[]>> = {};
    data.forEach(r => {
      if (!byMessage[r.message_id]) byMessage[r.message_id] = {};
      if (!byMessage[r.message_id][r.reaction_type]) byMessage[r.message_id][r.reaction_type] = [];
      byMessage[r.message_id][r.reaction_type].push(r.user_id);
    });

    Object.entries(byMessage).forEach(([msgId, emojis]) => {
      grouped[msgId] = Object.entries(emojis).map(([emoji, users]) => ({
        emoji,
        users,
        isOwn: users.includes(currentUserId),
      }));
    });

    setReactions(grouped);
  }, [messages, currentUserId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    // Check if user already reacted to this message
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id, reaction_type')
      .eq('message_id', messageId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === emoji) {
        // Remove reaction (toggle off)
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        // Update to new emoji
        await supabase.from('message_reactions').update({ reaction_type: emoji }).eq('id', existing.id);
      }
    } else {
      // Insert new reaction
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: currentUserId,
        reaction_type: emoji,
      });
    }

    await fetchReactions();
  };

  // Get user's own reaction for a message
  const getOwnReaction = (messageId: string): string | null => {
    const msgReactions = reactions[messageId];
    if (!msgReactions || !currentUserId) return null;
    const own = msgReactions.find(r => r.isOwn);
    return own?.emoji || null;
  };

  // Reset initial-scroll flag when chat changes (messages array reference changes drastically)
  // We detect "first load" as the first time messages.length becomes > 0.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (messages.length === 0) {
      didInitialScrollRef.current = false;
      return;
    }

    if (!didInitialScrollRef.current) {
      // Initial jump to bottom — do it now, then again after layout/images settle
      const jump = () => {
        container.scrollTop = container.scrollHeight;
      };
      jump();
      requestAnimationFrame(jump);
      const t1 = setTimeout(jump, 100);
      const t2 = setTimeout(jump, 400);
      // Re-jump as images inside load
      const imgs = Array.from(container.querySelectorAll('img'));
      imgs.forEach(img => {
        if (!(img as HTMLImageElement).complete) {
          img.addEventListener('load', jump, { once: true });
          img.addEventListener('error', jump, { once: true });
        }
      });
      didInitialScrollRef.current = true;
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // Subsequent updates: only scroll if user is near bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Find the very last sender message (for delivered indicator if not read)
  const lastSenderMsgId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isSender && !messages[i].systemEvent) return messages[i].id;
    }
    return null;
  })();

  // Find the last *read* sender message (where to show recipient's avatar)
  // Only show avatar on the most-recent read message, like Messenger
  const lastReadSenderMsgId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.isSender && !m.systemEvent && m.read === true) return m.id;
    }
    return null;
  })();

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-4 flex flex-col justify-end" style={{ minHeight: '100%' }}>
          {messages.length > 0 ? (
            messages.map((message) => (
              <div key={message.id}>
                {message.systemEvent ? (
                  <div className="flex justify-center my-2">
                    <div className="text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
                      {renderSystemEvent(message.systemEvent, message.text)}
                    </div>
                  </div>
                ) : (
                <div
                  className={`group flex items-center gap-1 ${message.isSender ? "justify-end" : "justify-start"}`}
                >
                  {/* Actions before message (for sender's messages) */}
                  {message.isSender && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <div className="flex items-center gap-0.5">
                        {onEditMessage && onDeleteMessage && (
                          <MessageActions
                            messageId={message.id}
                            messageText={message.text}
                            onEdit={onEditMessage}
                            onDelete={onDeleteMessage}
                          />
                        )}
                        <MessageReactionPicker
                          onSelect={(emoji) => handleReaction(message.id, emoji)}
                          existingReaction={getOwnReaction(message.id)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="relative max-w-[80%]">
                    {isGroup && !message.isSender && message.senderName && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                        {message.senderAvatar && (
                          <img
                            src={message.senderAvatar}
                            alt={message.senderName}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">
                          {message.senderName}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        message.isSender
                          ? "bg-gradient-purple text-white"
                          : "bg-muted"
                      }`}
                    >
                      {message.attachmentUrl && message.attachmentType === 'image' && (
                        <img 
                          src={message.attachmentUrl} 
                          alt="Вкладення" 
                          loading="lazy"
                          className="max-w-[200px] rounded-lg cursor-pointer mb-2 hover:opacity-90 transition-opacity"
                          onClick={() => setZoomedImage(message.attachmentUrl!)}
                        />
                      )}
                      {message.attachmentUrl && message.attachmentType === 'audio' && (
                        <audio
                          controls
                          preload="metadata"
                          src={message.attachmentUrl}
                          className="max-w-[260px] w-[260px] mb-1 rounded-full"
                          style={{ height: 40 }}
                        />
                      )}

                      {message.text && <p className="text-sm">{message.text}</p>}
                      
                      <div className={`mt-1 flex items-center gap-1 text-xs ${
                        message.isSender ? "justify-end text-white/70" : "text-muted-foreground"
                      }`}>
                        {message.isEdited && (
                          <span className="italic">(редаговано)</span>
                        )}
                        <span>{message.timestamp}</span>
                      </div>
                    </div>
                    
                    {/* Read receipt: avatar only on the latest READ message; CheckCheck on the latest UNREAD sender message */}
                    {!isGroup && message.isSender && !message.systemEvent && (
                      <>
                        {message.id === lastReadSenderMsgId && (
                          recipientAvatarUrl ? (
                            <div className="flex justify-end items-center gap-1 mt-1 pr-1">
                              <img
                                src={recipientAvatarUrl}
                                alt="Переглянуто"
                                title="Переглянуто"
                                className="w-[18px] h-[18px] rounded-full object-cover ring-1 ring-background"
                              />
                            </div>
                          ) : (
                            <div className="flex justify-end items-center gap-0.5 mt-1 pr-1 text-primary" title="Переглянуто">
                              <CheckCheck className="w-3.5 h-3.5" />
                            </div>
                          )
                        )}
                        {message.id === lastSenderMsgId && message.id !== lastReadSenderMsgId && (
                          <div className="flex justify-end items-center gap-0.5 mt-1 pr-1 text-muted-foreground" title="Доставлено">
                            <CheckCheck className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Reactions display */}
                    <MessageReactions
                      reactions={reactions[message.id] || []}
                      onToggle={(emoji) => handleReaction(message.id, emoji)}
                    />
                  </div>

                  {/* Actions after message (for received messages) */}
                  {!message.isSender && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <MessageReactionPicker
                        onSelect={(emoji) => handleReaction(message.id, emoji)}
                        existingReaction={getOwnReaction(message.id)}
                      />
                    </div>
                  )}
                </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground">
              {emptyStateMessage || "Початок розмови"}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {zoomedImage && (
            <img 
              src={zoomedImage} 
              alt="Збільшене зображення" 
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
