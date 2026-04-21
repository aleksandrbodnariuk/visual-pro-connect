
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

  static async createNewChat(receiverId: string, existingChats: ChatItem[] = []): Promise<{
    chats: ChatItem[],
    activeChat?: ChatItem
  }> {
    try {
      if (import.meta.env.DEV) console.log("Creating new chat with user:", receiverId);
      
      // Використовуємо get_safe_public_profiles_by_ids замість видаленої get_safe_user_profile
      const { data: usersData, error: userError } = await supabase
        .rpc('get_safe_public_profiles_by_ids', { _ids: [receiverId] });
        
      if (userError) {
        if (import.meta.env.DEV) console.error("Помилка при отриманні даних користувача:", userError);
        return { chats: existingChats };
      }
      
      const userData = usersData?.[0];
      
      if (userData) {
        if (import.meta.env.DEV) console.log("Found user in Supabase:", userData);
        // Створюємо новий чат
        // Fetch last_seen for new chat partner via RPC (bypasses RLS for non-admins)
        const { data: lastSeenRows } = await supabase
          .rpc('get_users_last_seen', { _ids: [receiverId] });
        const lastSeenRow = lastSeenRows?.[0];
        
        const newChat: ChatItem = {
          id: `chat-${receiverId}`,
          user: {
            id: receiverId,
            name: userData.full_name || 'Користувач',
            username: 'user',
            avatarUrl: userData.avatar_url || '',
            lastSeen: lastSeenRow?.last_seen || '',
            unreadCount: 0
          },
          messages: [],
          lastMessage: {
            text: "Почніть розмову",
            timestamp: "Щойно"
          }
        };
        
        return {
          chats: [newChat, ...existingChats],
          activeChat: newChat
        };
      }
      
      return { chats: existingChats };
    } catch (error) {
      if (import.meta.env.DEV) console.error("Помилка при створенні нового чату:", error);
      return { chats: existingChats };
    }
  }

  static async sendMessage(
    currentUser: any, 
    receiverId: string, 
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
    
    if (import.meta.env.DEV) console.log("Sending message from", currentUser.id, "to", receiverId);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: currentUser?.id,
            receiver_id: receiverId,
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
      
      // Використовуємо реальний ID з бази даних
      const newMessage: Message = {
        id: data.id,
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSender: true,
        attachmentUrl,
        attachmentType
      };
      
      if (import.meta.env.DEV) console.log("Message sent to Supabase successfully:", data);
      toast.success("Повідомлення надіслано");
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

  static async deleteChat(userId: string, chatUserId: string): Promise<boolean> {
    try {
      // Delete all messages between the two users (only ones the current user can delete via RLS)
      const { error: error1 } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', userId)
        .eq('receiver_id', chatUserId);

      const { error: error2 } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', chatUserId)
        .eq('receiver_id', userId);

      if (error1 || error2) {
        if (import.meta.env.DEV) console.error("Помилка при видаленні чату:", error1 || error2);
        toast.error("Не вдалося видалити чат");
        return false;
      }

      toast.success("Чат видалено");
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error("Помилка при видаленні чату:", err);
      toast.error("Помилка видалення чату");
      return false;
    }
  }

  static async markMessagesAsRead(userId: string, chatUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', chatUserId)
        .eq('read', false);

      if (error) {
        if (import.meta.env.DEV) console.error("Помилка при позначенні повідомлень:", error);
        return false;
      }

      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error("Помилка при позначенні повідомлень:", err);
      return false;
    }
  }
}
