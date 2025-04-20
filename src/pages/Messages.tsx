
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Тестові дані для демонстрації
const CHATS = [
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
    lastMessage: {
      text: "Дякую за співпрацю! Буду радий попрацювати з вами знову.",
      timestamp: "Вчора"
    }
  },
  {
    id: "chat3",
    user: {
      id: "user6",
      name: "Анна Михайленко",
      username: "anna_event",
      avatarUrl: "https://i.pravatar.cc/150?img=16",
      lastSeen: "2 год тому",
      unreadCount: 0
    },
    lastMessage: {
      text: "Чи можемо ми обговорити деталі події наступного тижня?",
      timestamp: "Пн"
    }
  }
];

const MESSAGES = [
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
];

export default function Messages() {
  const [activeChat, setActiveChat] = useState(CHATS[0]);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState(MESSAGES);
  const [chats, setChats] = useState(CHATS);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Отримуємо дані поточного користувача
    const user = localStorage.getItem("currentUser");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }

    // Спроба отримати повідомлення з Supabase
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (error) {
          console.error("Помилка при завантаженні повідомлень:", error);
        } else if (data && data.length > 0) {
          // Якщо є дані в Supabase, використовуємо їх
          console.log("Завантажено повідомлення з Supabase:", data);
        }
      } catch (err) {
        console.error("Помилка при завантаженні повідомлень:", err);
      }
    };
    
    fetchMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    // Створюємо нове повідомлення
    const newMessage = {
      id: `msg${messages.length + 1}`,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSender: true
    };
    
    try {
      // Спроба зберегти в Supabase
      if (currentUser?.id) {
        const { error } = await supabase
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
          throw error;
        }
      }
      
      // Оновлюємо локальний стан
      setMessages([...messages, newMessage]);
      
      // Оновлюємо останнє повідомлення в чаті
      const updatedChats = chats.map(chat => 
        chat.id === activeChat.id 
          ? {
              ...chat,
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
      setMessages([...messages, newMessage]);
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
                {filteredChats.map((chat) => (
                  <div 
                    key={chat.id}
                    className={`flex items-start gap-3 border-b p-3 transition-colors hover:bg-muted/50 cursor-pointer ${activeChat.id === chat.id ? 'bg-muted/80' : ''}`}
                    onClick={() => setActiveChat(chat)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.user.avatarUrl} alt={chat.user.name} />
                      <AvatarFallback>
                        {chat.user.name
                          .split(" ")
                          .map((n) => n[0])
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
                ))}
              </div>
            </div>
            
            {/* Вікно чату */}
            <div className="flex h-[80vh] flex-col md:col-span-2 lg:col-span-3">
              <div className="border-b p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeChat.user.avatarUrl} alt={activeChat.user.name} />
                    <AvatarFallback>
                      {activeChat.user.name
                        .split(" ")
                        .map((n) => n[0])
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
                  {messages.map((message) => (
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
                  ))}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
