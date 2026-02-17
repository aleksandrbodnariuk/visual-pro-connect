
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
}

export interface ChatItem {
  id: string;
  user: ChatUser;
  messages: Message[];
  lastMessage: {
    text: string;
    timestamp: string;
  };
}

export class MessagesService {
  static async fetchChatsAndMessages(userId: string, receiverId: string | null): Promise<{
    chats: ChatItem[],
    activeChat?: ChatItem
  }> {
    // Зберігаємо userId для підрахунку непрочитаних
    try {
      if (import.meta.env.DEV) console.log("Fetching chats for user:", userId, "with receiver:", receiverId);
      
      // Отримуємо всі повідомлення користувача з Supabase (без join)
      const { data: messageData, error: messagesError } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, read, created_at, is_edited, edited_at, attachment_url, attachment_type')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });
        
      if (messagesError) {
        if (import.meta.env.DEV) console.error("Помилка при завантаженні повідомлень:", messagesError);
        if (receiverId) {
          return MessagesService.createNewChat(receiverId, []);
        }
        return { chats: [] };
      }
      
      // Якщо є повідомлення в Supabase
      if (messageData && messageData.length > 0) {
        if (import.meta.env.DEV) console.log("Found messages in Supabase:", messageData);
        
        // Збираємо унікальні ID користувачів (крім поточного)
        const userIds = new Set<string>();
        messageData.forEach(msg => {
          if (msg.sender_id !== userId) userIds.add(msg.sender_id);
          if (msg.receiver_id !== userId) userIds.add(msg.receiver_id);
        });
        
        // Отримуємо профілі користувачів через RPC
        const { data: profilesData, error: profilesError } = await supabase
          .rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(userIds) });
        
        if (profilesError) {
          if (import.meta.env.DEV) console.error("Помилка при отриманні профілів:", profilesError);
        }
        
        // Створюємо Map профілів для швидкого доступу
        const profilesMap = new Map<string, any>();
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap.set(profile.id, profile);
          });
        }
        
        // Групуємо повідомлення по користувачам
        const chatUsers = new Map<string, { id: string; messages: any[] }>();
        
        messageData.forEach(message => {
          const chatPartnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
          
          if (!chatUsers.has(chatPartnerId)) {
            chatUsers.set(chatPartnerId, {
              id: chatPartnerId,
              messages: []
            });
          }
          
          chatUsers.get(chatPartnerId)!.messages.push(message);
        });
        
        // Перетворюємо Map в масив чатів
        const chatsArray: ChatItem[] = Array.from(chatUsers.values()).map(chat => {
          const profile = profilesMap.get(chat.id);
          
          // Сортуємо повідомлення за часом
          const sortedMessages = chat.messages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const lastMessage = sortedMessages[sortedMessages.length - 1];
          
          // Підрахунок непрочитаних повідомлень (де receiver = поточний користувач, read = false)
          const unreadMessages = sortedMessages.filter(
            msg => msg.receiver_id === userId && msg.read === false
          );
          
          return {
            id: `chat-${chat.id}`,
            user: {
              id: chat.id,
              name: profile?.full_name || 'Користувач',
              username: 'user',
              avatarUrl: profile?.avatar_url || '',
              lastSeen: 'Онлайн',
              unreadCount: unreadMessages.length
            },
            messages: sortedMessages.map((msg) => ({
              id: msg.id,
              text: msg.content,
              timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSender: msg.sender_id === userId,
              isEdited: msg.is_edited || false,
              editedAt: msg.edited_at ? new Date(msg.edited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              attachmentUrl: msg.attachment_url || undefined,
              attachmentType: msg.attachment_type || undefined
            })),
            lastMessage: {
              text: lastMessage.content,
              timestamp: new Date(lastMessage.created_at).toLocaleDateString()
            }
          };
        });
        
        let selectedChat;
        
        if (receiverId) {
          selectedChat = chatsArray.find(chat => chat.user.id === receiverId);
          if (!selectedChat) {
            return MessagesService.createNewChat(receiverId, chatsArray);
          }
        }
        
        return {
          chats: chatsArray,
          activeChat: selectedChat || (chatsArray.length > 0 ? chatsArray[0] : undefined)
        };
      } else {
        if (receiverId) {
          return MessagesService.createNewChat(receiverId, []);
        }
        return { chats: [] };
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Помилка при завантаженні чатів та повідомлень:", error);
      if (receiverId) {
        return MessagesService.createNewChat(receiverId, []);
      }
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
        const newChat: ChatItem = {
          id: `chat-${receiverId}`,
          user: {
            id: receiverId,
            name: userData.full_name || 'Користувач',
            username: 'user',
            avatarUrl: userData.avatar_url || '',
            lastSeen: 'Онлайн',
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
