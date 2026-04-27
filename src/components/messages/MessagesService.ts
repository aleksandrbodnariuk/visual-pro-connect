
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  lastSeen: string;
  unreadCount: number;
}

export interface Message {
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

export interface ChatItem {
  id: string;
  user: ChatUser;
  messages: Message[];
  lastMessage: {
    text: string;
    timestamp: string;
  };
  // Group chat extensions
  type?: 'direct' | 'group';
  conversationId?: string;
  title?: string;
  description?: string;
  avatarUrl?: string;
  memberIds?: string[];
  memberCount?: number;
  myRole?: 'owner' | 'admin' | 'member';
}

/**
 * Format a date for the chat list "last message timestamp" column.
 * Today = HH:mm, this week = day name, older = DD.MM.YYYY
 */
function formatChatListTimestamp(d: Date): string {
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString();
}

export class MessagesService {
  static async fetchChatsAndMessages(userId: string, receiverId: string | null): Promise<{
    chats: ChatItem[],
    activeChat?: ChatItem
  }> {
    try {
      // 1. Fetch all conversations the user is a member of
      const { data: convs, error: convError } = await supabase
        .rpc('get_user_conversations', { _user_id: userId });

      if (convError) {
        if (import.meta.env.DEV) console.error('Помилка при завантаженні бесід:', convError);
        return { chats: [] };
      }

      const conversationsList = (convs || []) as any[];

      // 2. Collect all member ids across all conversations to fetch profiles in one shot
      const allMemberIds = new Set<string>();
      conversationsList.forEach(c => {
        (c.member_ids || []).forEach((id: string) => {
          if (id !== userId) allMemberIds.add(id);
        });
      });

      let profilesMap = new Map<string, any>();
      let lastSeenMap = new Map<string, string | null>();
      if (allMemberIds.size > 0) {
        const ids = Array.from(allMemberIds);
        const [{ data: profilesData }, { data: lastSeenData }] = await Promise.all([
          supabase.rpc('get_safe_public_profiles_by_ids', { _ids: ids }),
          supabase.rpc('get_users_last_seen', { _ids: ids }),
        ]);
        if (profilesData) profilesData.forEach((p: any) => profilesMap.set(p.id, p));
        if (lastSeenData) lastSeenData.forEach((u: any) => lastSeenMap.set(u.id, u.last_seen));
      }

      // 3. Build chat items (without messages — they are loaded on demand)
      const chatsArray: ChatItem[] = conversationsList.map((c: any) => {
        const isGroup = c.type === 'group';
        const otherIds = (c.member_ids || []).filter((id: string) => id !== userId);
        const partnerId = otherIds[0];
        const partnerProfile = partnerId ? profilesMap.get(partnerId) : null;

        const displayName = isGroup
          ? (c.title || 'Група')
          : (partnerProfile?.full_name || 'Користувач');
        const displayAvatar = isGroup
          ? (c.avatar_url || '')
          : (partnerProfile?.avatar_url || '');
        const partnerLastSeen = isGroup ? '' : (lastSeenMap.get(partnerId) || '');

        const ts = c.last_message_at ? new Date(c.last_message_at) : new Date();
        return {
          id: c.conversation_id,
          conversationId: c.conversation_id,
          type: isGroup ? 'group' : 'direct',
          title: c.title,
          description: c.description,
          avatarUrl: c.avatar_url,
          memberIds: c.member_ids || [],
          memberCount: Number(c.member_count || 0),
          myRole: c.my_role,
          user: {
            id: isGroup ? c.conversation_id : (partnerId || ''),
            name: displayName,
            username: 'user',
            avatarUrl: displayAvatar,
            lastSeen: partnerLastSeen,
            unreadCount: Number(c.unread_count || 0),
          },
          messages: [],
          lastMessage: {
            text: c.last_message_text || (isGroup ? 'Група створена' : 'Почніть розмову'),
            timestamp: formatChatListTimestamp(ts),
          },
        };
      });

      // 4. If receiverId provided, ensure direct conversation exists and load it
      let selectedChat: ChatItem | undefined;
      if (receiverId) {
        // First, check if it's an existing conversation_id (group chat link)
        let convId: string | null = null;
        const existingByConvId = chatsArray.find(c => c.conversationId === receiverId);
        if (existingByConvId) {
          convId = existingByConvId.conversationId!;
        } else {
          // Try to find direct chat with this user
          const existingDirect = chatsArray.find(c => c.type === 'direct' && c.user.id === receiverId);
          if (existingDirect) {
            convId = existingDirect.conversationId!;
          } else {
            // Create a new direct conversation
            const { data: newConvId, error: rpcErr } = await supabase
              .rpc('get_or_create_direct_conversation', { _other_user_id: receiverId });
            if (rpcErr) {
              if (import.meta.env.DEV) console.error('Не вдалося створити бесіду:', rpcErr);
            } else if (newConvId) {
              convId = newConvId as unknown as string;
              // Build a placeholder chat item for the new conversation
              const { data: prof } = await supabase
                .rpc('get_safe_public_profiles_by_ids', { _ids: [receiverId] });
              const p = prof?.[0];
              const newChat: ChatItem = {
                id: convId,
                conversationId: convId,
                type: 'direct',
                memberIds: [userId, receiverId],
                memberCount: 2,
                myRole: 'member',
                user: {
                  id: receiverId,
                  name: p?.full_name || 'Користувач',
                  username: 'user',
                  avatarUrl: p?.avatar_url || '',
                  lastSeen: '',
                  unreadCount: 0,
                },
                messages: [],
                lastMessage: { text: 'Почніть розмову', timestamp: 'Щойно' },
              };
              chatsArray.unshift(newChat);
            }
          }
        }

        if (convId) {
          const chat = chatsArray.find(c => c.conversationId === convId);
          if (chat) {
            chat.messages = await MessagesService.loadConversationMessages(convId, userId);
            selectedChat = chat;
          }
        }
      }

      return { chats: chatsArray, activeChat: selectedChat };
    } catch (error) {
      if (import.meta.env.DEV) console.error("Помилка при завантаженні чатів та повідомлень:", error);
      return { chats: [] };
    }
  }

  /**
   * Load all messages for a conversation. Returns Message[] in chronological order.
   * Also enriches with sender profile info (needed for group chats).
   */
  static async loadConversationMessages(conversationId: string, currentUserId: string): Promise<Message[]> {
    const { data: messageData, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, read, created_at, is_edited, edited_at, attachment_url, attachment_type, system_event')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !messageData) {
      if (import.meta.env.DEV) console.error('Помилка завантаження повідомлень:', error);
      return [];
    }

    // Fetch sender profiles for non-self senders (needed for group chats)
    const senderIds = Array.from(new Set(messageData.map(m => m.sender_id).filter(id => id !== currentUserId)));
    const profilesMap = new Map<string, any>();
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .rpc('get_safe_public_profiles_by_ids', { _ids: senderIds });
      if (profiles) profiles.forEach((p: any) => profilesMap.set(p.id, p));
    }

    return messageData.map(msg => {
      const profile = profilesMap.get(msg.sender_id);
      return {
        id: msg.id,
        text: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSender: msg.sender_id === currentUserId,
        isEdited: msg.is_edited || false,
        editedAt: msg.edited_at ? new Date(msg.edited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        attachmentUrl: msg.attachment_url || undefined,
        attachmentType: msg.attachment_type || undefined,
        read: msg.read ?? false,
        senderId: msg.sender_id,
        senderName: profile?.full_name,
        senderAvatar: profile?.avatar_url,
        systemEvent: msg.system_event || undefined,
      };
    });
  }

  /**
   * Create a new group chat with the given title and member ids.
   * Returns the new conversation_id.
   */
  static async createGroup(title: string, memberIds: string[]): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_group_conversation', { _title: title, _member_ids: memberIds });
      if (error) {
        toast.error(error.message || 'Не вдалося створити групу');
        return null;
      }
      toast.success('Групу створено');
      return data as unknown as string;
    } catch (e: any) {
      toast.error(e?.message || 'Помилка створення групи');
      return null;
    }
  }

  static async addMembersToGroup(conversationId: string, userIds: string[]): Promise<boolean> {
    const { error } = await supabase
      .rpc('add_members_to_group', { _conv_id: conversationId, _user_ids: userIds });
    if (error) {
      toast.error(error.message || 'Не вдалося додати учасників');
      return false;
    }
    toast.success('Учасників додано');
    return true;
  }

  static async removeMemberFromGroup(conversationId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .rpc('remove_member_from_group', { _conv_id: conversationId, _user_id: userId });
    if (error) {
      toast.error(error.message || 'Не вдалося видалити учасника');
      return false;
    }
    toast.success('Учасника видалено');
    return true;
  }

  static async leaveConversation(conversationId: string): Promise<boolean> {
    const { error } = await supabase
      .rpc('leave_conversation', { _conv_id: conversationId });
    if (error) {
      toast.error(error.message || 'Не вдалося вийти з чату');
      return false;
    }
    toast.success('Ви покинули чат');
    return true;
  }

  static async renameGroup(conversationId: string, title: string): Promise<boolean> {
    const { error } = await supabase
      .rpc('update_conversation_title', { _conv_id: conversationId, _title: title });
    if (error) {
      toast.error(error.message || 'Не вдалося перейменувати');
      return false;
    }
    toast.success('Назву оновлено');
    return true;
  }

  static async updateGroupAvatar(conversationId: string, avatarUrl: string): Promise<boolean> {
    const { error } = await supabase
      .rpc('update_conversation_avatar', { _conv_id: conversationId, _avatar_url: avatarUrl });
    if (error) {
      toast.error(error.message || 'Не вдалося оновити аватар');
      return false;
    }
    toast.success('Аватар оновлено');
    return true;
  }

  static async updateGroupDescription(conversationId: string, description: string): Promise<boolean> {
    const { error } = await supabase
      .rpc('update_conversation_description', { _conv_id: conversationId, _description: description });
    if (error) {
      toast.error(error.message || 'Не вдалося оновити правила');
      return false;
    }
    toast.success('Правила оновлено');
    return true;
  }

  static async updateMemberRole(
    conversationId: string,
    userId: string,
    newRole: 'admin' | 'member'
  ): Promise<boolean> {
    const { error } = await supabase
      .rpc('update_member_role', { _conv_id: conversationId, _user_id: userId, _new_role: newRole });
    if (error) {
      toast.error(error.message || 'Не вдалося змінити роль');
      return false;
    }
    toast.success(newRole === 'admin' ? 'Призначено співвласником/модератором' : 'Знижено до учасника');
    return true;
  }

  static async sendMessage(
    currentUser: any, 
    conversationId: string,
    messageText: string,
    attachmentUrl?: string,
    attachmentType?: string
  ): Promise<{
    success: boolean;
    newMessage?: Message;
  }> {
    if ((!messageText.trim() && !attachmentUrl) || !currentUser) {
      return { success: false };
    }

    if (messageText.length > 5000) {
      toast.error("Повідомлення не може перевищувати 5000 символів.");
      return { success: false };
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: currentUser?.id,
            conversation_id: conversationId,
            content: messageText,
            read: false,
            attachment_url: attachmentUrl || null,
            attachment_type: attachmentType || null
          }
        ])
        .select()
        .single();
          
      if (error) {
        if (import.meta.env.DEV) console.error("Помилка при відправленні повідомлення:", error);
        toast.error("Не вдалося надіслати повідомлення. Спробуйте ще раз.");
        return { success: false };
      }

      const newMessage: Message = {
        id: data.id,
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSender: true,
        attachmentUrl,
        attachmentType,
        senderId: currentUser?.id,
      };

      return { success: true, newMessage };
    } catch (err) {
      if (import.meta.env.DEV) console.error("Помилка при відправленні повідомлення:", err);
      toast.error("Помилка відправки повідомлення");
      return { success: false };
    }
  }

  static async editMessage(messageId: string, newContent: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        if (import.meta.env.DEV) console.error("Помилка при редагуванні повідомлення:", error);
        toast.error("Не вдалося редагувати повідомлення");
        return false;
      }

      toast.success("Повідомлення відредаговано");
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error("Помилка при редагуванні повідомлення:", err);
      toast.error("Помилка редагування повідомлення");
      return false;
    }
  }

  static async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        if (import.meta.env.DEV) console.error("Помилка при видаленні повідомлення:", error);
        toast.error("Не вдалося видалити повідомлення");
        return false;
      }

      toast.success("Повідомлення видалено");
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error("Помилка при видаленні повідомлення:", err);
      toast.error("Помилка видалення повідомлення");
      return false;
    }
  }

  /**
   * Delete or leave a chat. For direct chats — leave (which deletes if alone).
   * For groups — leave the conversation.
   */
  static async deleteChat(_userId: string, conversationId: string): Promise<boolean> {
    return MessagesService.leaveConversation(conversationId);
  }

  /**
   * Mark conversation as read.
   * The RPC `mark_conversation_read` runs as SECURITY DEFINER and updates
   * BOTH `conversation_members.last_read_at` AND `messages.read = true`
   * for messages from other senders. This is the single source of truth
   * for read-receipts, and bypasses RLS on the `messages` table.
   */
  static async markMessagesAsRead(_userId: string, conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('mark_conversation_read', { _conv_id: conversationId });
      if (error) {
        if (import.meta.env.DEV) console.error('Помилка mark_conversation_read:', error);
        return false;
      }
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error('Помилка markMessagesAsRead:', err);
      return false;
    }
  }
}
