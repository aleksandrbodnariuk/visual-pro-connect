
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
    try {
      console.log("Fetching chats for user:", userId, "with receiver:", receiverId);
      
      // Отримуємо всі повідомлення користувача з Supabase
      const { data: messageData, error: messagesError } = await supabase
        .from('messages')
        .select('*, sender:sender_id(*), receiver:receiver_id(*)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });
        
      if (messagesError) {
        console.error("Помилка при завантаженні повідомлень:", messagesError);
        // Якщо є receiverId, створюємо новий чат
        if (receiverId) {
          return MessagesService.createNewChat(receiverId, []);
        }
        return { chats: [] };
      }
      
      // Якщо є повідомлення в Supabase
      if (messageData && messageData.length > 0) {
        console.log("Found messages in Supabase:", messageData);
        
        // Створюємо об'єкт унікальних користувачів для чатів
        const chatUsers = new Map();
        
        // Проходимося по всім повідомленням і групуємо їх по користувачам
        messageData.forEach(message => {
          const chatPartnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
          const chatPartner = message.sender_id === userId ? message.receiver : message.sender;
          
          if (!chatUsers.has(chatPartnerId)) {
            chatUsers.set(chatPartnerId, {
              id: chatPartnerId,
              user: chatPartner,
              messages: [],
              lastMessage: null
            });
          }
          
          chatUsers.get(chatPartnerId).messages.push(message);
        });
        
        // Перетворюємо Map в масив чатів та сортуємо за часом останнього повідомлення
        const chatsArray = Array.from(chatUsers.values()).map(chat => {
          // Сортуємо повідомлення за часом
          const sortedMessages = chat.messages.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Беремо останнє повідомлення
          const lastMessage = sortedMessages[sortedMessages.length - 1];
          
          return {
            id: `chat-${chat.id}`,
            user: {
              id: chat.id,
              name: chat.user?.full_name || 'Користувач',
              username: chat.user?.phone_number || 'user',
              avatarUrl: chat.user?.avatar_url || '',
              lastSeen: 'Онлайн',
              unreadCount: 0
            },
            messages: sortedMessages.map((msg: any) => ({
              id: msg.id,
              text: msg.content,
              timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSender: msg.sender_id === userId
            })),
            lastMessage: {
              text: lastMessage.content,
              timestamp: new Date(lastMessage.created_at).toLocaleDateString()
            }
          };
        });
        
        let selectedChat;
        
        // Якщо є активний чат або новий отримувач, встановлюємо активний чат
        if (receiverId) {
          selectedChat = chatsArray.find(chat => chat.user.id === receiverId);
          if (!selectedChat) {
            // Якщо чат з цим користувачем ще не існує, створюємо новий
            return MessagesService.createNewChat(receiverId, chatsArray);
          }
        }
        
        return {
          chats: chatsArray,
          activeChat: selectedChat || (chatsArray.length > 0 ? chatsArray[0] : undefined)
        };
      } else {
        // Якщо немає повідомлень, але є receiverId, створюємо новий чат
        if (receiverId) {
          return MessagesService.createNewChat(receiverId, []);
        }
        return { chats: [] };
      }
    } catch (error) {
      console.error("Помилка при завантаженні чатів та повідомлень:", error);
      // Якщо є receiverId, створюємо новий чат
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
      console.log("Creating new chat with user:", receiverId);
      
      const { data: userData, error: userError } = await (supabase as any)
        .rpc('get_safe_user_profile', { user_uuid: receiverId })
        .single();
        
      if (userError) {
        console.error("Помилка при отриманні даних користувача:", userError);
        
        // Спробуємо знайти користувача в localStorage
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const localUser = localUsers.find((user: any) => user.id === receiverId);
        
        if (localUser) {
          console.log("Found user in localStorage:", localUser);
          const newChat = {
            id: `chat-${receiverId}`,
            user: {
              id: receiverId,
              name: localUser.full_name || `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim() || 'Користувач',
              username: localUser.phone_number || localUser.phoneNumber || 'user',
              avatarUrl: localUser.avatar_url || localUser.avatarUrl || '',
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
      }
      
      if (userData) {
        console.log("Found user in Supabase:", userData);
        // Створюємо новий чат
        const newChat = {
          id: `chat-${receiverId}`,
          user: {
            id: receiverId,
            name: userData.full_name || 'Користувач',
            username: userData.phone_number || 'user',
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
      console.error("Помилка при створенні нового чату:", error);
      return { chats: existingChats };
    }
  }

  static async sendMessage(currentUser: any, receiverId: string, messageText: string): Promise<{
    success: boolean;
    newMessage?: Message;
  }> {
    if (!messageText.trim() || !currentUser) {
      return { success: false };
    }
    
    console.log("Sending message from", currentUser.id, "to", receiverId, ":", messageText);
    
    // Створюємо нове повідомлення
    const newMessage = {
      id: `msg${crypto.randomUUID()}`,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSender: true
    };
    
    try {
      // Відправляємо повідомлення безпосередньо в Supabase з правильним auth.uid()
      console.log("Attempting to send message from user:", currentUser?.id, "to:", receiverId);
      
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: currentUser?.id,
            receiver_id: receiverId,
            content: messageText,
            read: false
          }
        ])
        .select();
          
      if (error) {
        console.error("Помилка при відправленні повідомлення:", error);
        console.error("Error details:", error.message, error.details, error.hint);
        toast.error(`Помилка відправки: ${error.message}`);
        return { success: false };
      } else {
        console.log("Message sent to Supabase successfully:", data);
        toast.success("Повідомлення надіслано");
        return { success: true, newMessage };
      }
    } catch (err) {
      console.error("Помилка при відправленні повідомлення:", err);
      toast.error("Помилка відправки повідомлення");
      return { success: false };
    }
  }
}
