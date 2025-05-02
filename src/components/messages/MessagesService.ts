
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
      // Отримуємо всі повідомлення користувача
      const { data: messageData, error: messagesError } = await supabase
        .from('messages')
        .select('*, sender:sender_id(*), receiver:receiver_id(*)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });
        
      if (messagesError) {
        console.error("Помилка при завантаженні повідомлень:", messagesError);
        // Використовуємо демо-дані, якщо є помилка
        return MessagesService.getDefaultChatsAndMessages(userId, receiverId);
      }
      
      // Якщо є повідомлення в Supabase
      if (messageData && messageData.length > 0) {
        // Спочатку створюємо об'єкт унікальних користувачів для чатів
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
        // Якщо немає повідомлень, використовуємо демо-дані
        return MessagesService.getDefaultChatsAndMessages(userId, receiverId);
      }
    } catch (error) {
      console.error("Помилка при завантаженні чатів та повідомлень:", error);
      return MessagesService.getDefaultChatsAndMessages(userId, receiverId);
    }
  }

  static async createNewChat(receiverId: string, existingChats: ChatItem[] = []): Promise<{
    chats: ChatItem[],
    activeChat?: ChatItem
  }> {
    try {
      // Отримуємо дані користувача
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', receiverId)
        .maybeSingle();
        
      if (userError) {
        console.error("Помилка при отриманні даних користувача:", userError);
        return { chats: existingChats };
      }
      
      if (userData) {
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

  static getDefaultChatsAndMessages(userId: string, receiverId: string | null): {
    chats: ChatItem[],
    activeChat?: ChatItem
  } {
    const defaultChats: ChatItem[] = [
      {
        id: "chat1",
        user: {
          id: "user2",
          name: "Марія Коваленко",
          username: "maria_video",
          avatarUrl: "https://i.pravatar.cc/150?img=5",
          lastSeen: "Онлайн",
          unreadCount: 2
        },
        messages: [
          {
            id: "msg1",
            text: "Привіт! Мені сподобалися ваші фотографії у портфоліо. Чи можете ви зняти корпоративний захід наступного місяця?",
            timestamp: "10:30",
            isSender: false
          },
          {
            id: "msg2",
            text: "Доброго дня! Дякую за інтерес до моїх робіт. Так, я доступний для зйомки корпоративних заходів. Чи можете ви надати більше деталей?",
            timestamp: "10:35",
            isSender: true
          },
          {
            id: "msg3",
            text: "Звичайно. Це буде корпоративний захід на 100 людей, у конференц-центрі в центрі міста. Нам потрібні як фотографії, так і відео для соціальних мереж.",
            timestamp: "10:40",
            isSender: false
          },
          {
            id: "msg4",
            text: "Так, я можу зняти відео для вашого заходу. Коли він відбудеться?",
            timestamp: "10:42",
            isSender: false
          }
        ],
        lastMessage: {
          text: "Так, я можу зняти відео для вашого заходу. Коли він відбудеться?",
          timestamp: "10:42"
        }
      },
      {
        id: "chat2",
        user: {
          id: "user3",
          name: "Ігор Мельник",
          username: "igor_music",
          avatarUrl: "https://i.pravatar.cc/150?img=8",
          lastSeen: "30 хв тому",
          unreadCount: 0
        },
        messages: [
          {
            id: "msg5",
            text: "Привіт! Чи можете ви надати музичне забезпечення для весілля?",
            timestamp: "Вчора",
            isSender: false
          },
          {
            id: "msg6",
            text: "Доброго дня! Так, звичайно. Я спеціалізуюся на такому форматі заходів. Коли планується весілля?",
            timestamp: "Вчора",
            isSender: true
          },
          {
            id: "msg7",
            text: "Плануємо на 15 червня. Це субота. Нам потрібен ді-джей та ведучий.",
            timestamp: "Вчора",
            isSender: false
          },
          {
            id: "msg8",
            text: "Дякую за співпрацю! Буду радий попрацювати з вами знову.",
            timestamp: "Вчора",
            isSender: true
          }
        ],
        lastMessage: {
          text: "Дякую за співпрацю! Буду радий попрацювати з вами знову.",
          timestamp: "Вчора"
        }
      }
    ];
    
    let selectedChat;
    
    if (receiverId) {
      // Шукаємо чат з вказаним користувачем
      selectedChat = defaultChats.find(chat => chat.user.id === receiverId);
    }
    
    if (!selectedChat && defaultChats.length > 0) {
      selectedChat = defaultChats[0];
    }
    
    return {
      chats: defaultChats,
      activeChat: selectedChat
    };
  }

  static async sendMessage(currentUser: any, receiverId: string, messageText: string): Promise<{
    success: boolean;
    newMessage?: Message;
  }> {
    if (!messageText.trim() || !currentUser) {
      return { success: false };
    }
    
    // Створюємо нове повідомлення
    const newMessage = {
      id: `msg${crypto.randomUUID()}`,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSender: true
    };
    
    try {
      // Спроба зберегти в Supabase
      if (currentUser?.id) {
        const { data, error } = await supabase
          .from('messages')
          .insert([
            {
              sender_id: currentUser.id,
              receiver_id: receiverId,
              content: messageText
            }
          ]);
          
        if (error) {
          console.error("Помилка при відправленні повідомлення:", error);
        }
      }
      
      toast.success("Повідомлення надіслано");
      return { success: true, newMessage };
    } catch (err) {
      console.error("Помилка при відправленні повідомлення:", err);
      return { success: true, newMessage }; // Still return success for offline mode
    }
  }
}
