import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { MessageActions } from "./MessageActions";
import { MessageReactionPicker } from "./MessageReactionPicker";
import { MessageReactions } from "./MessageReactions";
import { supabase } from "@/integrations/supabase/client";
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
}

interface ReactionData {
  emoji: string;
  users: string[];
  isOwn: boolean;
}

interface MessageListProps {
  messages: Message[];
  emptyStateMessage?: ReactNode;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export function MessageList({ 
  messages, 
  emptyStateMessage,
  onEditMessage,
  onDeleteMessage 
}: MessageListProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionData[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages arrive (only if near bottom)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Scroll to bottom on initial mount
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isSender ? "justify-end" : "justify-start"}`}
              >
                <div className={`relative group max-w-[80%]`}>
                  {/* Reaction picker - appears above message */}
                  <div className={`absolute -top-8 z-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${message.isSender ? "right-0" : "left-0"}`}>
                    <MessageReactionPicker
                      onSelect={(emoji) => handleReaction(message.id, emoji)}
                      existingReaction={getOwnReaction(message.id)}
                    />
                    {message.isSender && onEditMessage && onDeleteMessage && (
                      <MessageActions
                        messageId={message.id}
                        messageText={message.text}
                        onEdit={onEditMessage}
                        onDelete={onDeleteMessage}
                      />
                    )}
                  </div>

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
                        className="max-w-[200px] rounded-lg cursor-pointer mb-2 hover:opacity-90 transition-opacity"
                        onClick={() => setZoomedImage(message.attachmentUrl!)}
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
                  
                  {/* Reactions display */}
                  <MessageReactions
                    reactions={reactions[message.id] || []}
                    onToggle={(emoji) => handleReaction(message.id, emoji)}
                  />
                </div>
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
