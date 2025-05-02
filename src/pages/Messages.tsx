
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Messages() {
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Отримуємо дані поточного користувача
    const user = localStorage.getItem("currentUser");
    const receiverId = localStorage.getItem("currentChatReceiverId");
    
    if (user) {
      const userData = JSON.parse(user);
      setCurrentUser(userData);
      
      // Завантажуємо всі чати та повідомлення
      fetchChatsAndMessages(userData.id, receiverId);
    }
  }, []);
  
  // Завантаження чатів та повідомлень
  const fetchChatsAndMessages = async (userId: string, receiverId: string | null) => {
    setIsLoading(true);
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
        useDefaultChatsAndMessages(userId, receiverId);
        return;
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
        
        setChats(chatsArray);
        
        // Якщо є активний чат або новий отримувач, встановлюємо активний чат
        if (receiverId) {
          const selectedChat = chatsArray.find(chat => chat.user.id === receiverId);
          if (selectedChat) {
            setActiveChat(selectedChat);
            setMessages(selectedChat.messages);
          } else {
            // Якщо чат з цим користувачем ще не існує, створюємо новий
            createNewChat(receiverId);
          }
        } else if (chatsArray.length > 0) {
          // За замовчуванням вибираємо перший чат
          setActiveChat(chatsArray[0]);
          setMessages(chatsArray[0].messages);
        }
      } else {
        // Якщо немає повідомлень, використовуємо демо-дані
        useDefaultChatsAndMessages(userId, receiverId);
      }
    } catch (error) {
      console.error("Помилка при завантаженні чатів та повідомлень:", error);
      useDefaultChatsAndMessages(userId, receiverId);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Створення нового чату з користувачем
  const createNewChat = async (receiverId: string) => {
    try {
      // Отримуємо дані користувача
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', receiverId)
        .maybeSingle();
        
      if (userError) {
        console.error("Помилка при отриманні даних користувача:", userError);
        return;
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
        
        setChats([newChat, ...chats]);
        setActiveChat(newChat);
        setMessages([]);
      }
    } catch (error) {
      console.error("Помилка при створенні нового чату:", error);
    }
  };
  
  // Використання демо-даних, якщо немає повідомлень
  const useDefaultChatsAndMessages = (userId: string, receiverId: string | null) => {
    const defaultChats = [
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
    
    setChats(defaultChats);
    
    if (receiverId) {
      // Шукаємо чат з вказаним користувачем
      const selectedChat = defaultChats.find(chat => chat.user.id === receiverId);
      if (selectedChat) {
        setActiveChat(selectedChat);
        setMessages(selectedChat.messages);
      } else {
        // Якщо немає чату з цим користувачем, беремо перший чат
        if (defaultChats.length > 0) {
          setActiveChat(defaultChats[0]);
          setMessages(defaultChats[0].messages);
        }
      }
    } else {
      // За замовчуванням встановлюємо перший чат
      if (defaultChats.length > 0) {
        setActiveChat(defaultChats[0]);
        setMessages(defaultChats[0].messages);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChat || !currentUser) return;
    
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
              receiver_id: activeChat.user.id,
              content: messageText
            }
          ]);
          
        if (error) {
          console.error("Помилка при відправленні повідомлення:", error);
        }
      }
      
      // Оновлюємо локальний стан
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      // Оновлюємо останнє повідомлення в чаті
      const updatedChats = chats.map(chat => 
        chat.id === activeChat.id 
          ? {
              ...chat,
              messages: updatedMessages,
              lastMessage: {
                text: messageText,
                timestamp: "Щойно"
              }
            }
          : chat
      );
      setChats(updatedChats);
      
      // Очищаємо поле вводу
      setMessageText("");
      
      toast.success("Повідомлення надіслано");
    } catch (err) {
      console.error("Помилка при відправленні повідомлення:", err);
      
      // Оновлюємо локальний стан навіть якщо є помилка з Supabase
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      setMessageText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectChat = (chat: any) => {
    setActiveChat(chat);
    setMessages(chat.messages);
    
    // Оновлюємо кількість непрочитаних повідомлень
    const updatedChats = chats.map(c => 
      c.id === chat.id 
        ? {...c, user: {...c.user, unreadCount: 0}}
        : c
    );
    setChats(updatedChats);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mt-8 flex items-center justify-center">
          <div>Завантаження повідомлень...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mt-8 pb-10">
        <div className="rounded-xl border">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            {/* Список чатів */}
            <div className="border-r md:col-span-1">
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Пошук повідомлень"
                    className="w-full pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="h-[calc(80vh-120px)] overflow-y-auto">
                {filteredChats.length > 0 ? (
                  filteredChats.map((chat) => (
                    <div 
                      key={chat.id}
                      className={`flex items-start gap-3 border-b p-3 transition-colors hover:bg-muted/50 cursor-pointer ${activeChat?.id === chat.id ? 'bg-muted/80' : ''}`}
                      onClick={() => selectChat(chat)}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chat.user.avatarUrl} alt={chat.user.name} />
                        <AvatarFallback>
                          {chat.user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{chat.user.name}</h3>
                          <span className="text-xs text-muted-foreground">{chat.lastMessage.timestamp}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm text-muted-foreground">
                            {chat.lastMessage.text}
                          </p>
                          {chat.user.unreadCount > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs text-white">
                              {chat.user.unreadCount}
                            </span>
                          )}
                        </div>
                        
                        <p className="mt-1 text-xs text-muted-foreground">
                          {chat.user.lastSeen}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Немає чатів для відображення
                  </div>
                )}
              </div>
            </div>
            
            {/* Вікно чату */}
            <div className="flex h-[80vh] flex-col md:col-span-2 lg:col-span-3">
              {activeChat ? (
                <>
                  <div className="border-b p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activeChat.user.avatarUrl} alt={activeChat.user.name} />
                        <AvatarFallback>
                          {activeChat.user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h3 className="font-semibold">{activeChat.user.name}</h3>
                        <p className="text-xs text-muted-foreground">{activeChat.user.lastSeen}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {messages.length > 0 ? (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isSender ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                message.isSender
                                  ? "bg-gradient-purple text-white"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{message.text}</p>
                              <span className={`mt-1 text-right text-xs ${
                                message.isSender ? "text-white/70" : "text-muted-foreground"
                              }`}>
                                {message.timestamp}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground">
                          Початок розмови з {activeChat.user.name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Напишіть повідомлення..."
                        className="flex-1"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <Button 
                        className="bg-gradient-purple rounded-full" 
                        size="icon"
                        onClick={handleSendMessage}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <p className="mb-2">Виберіть чат для початку листування</p>
                    <p>або додайте новий контакт через сторінку профілю</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
