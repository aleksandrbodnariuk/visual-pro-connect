
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send } from "lucide-react";

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
                  />
                </div>
              </div>
              
              <div className="h-[calc(80vh-120px)] overflow-y-auto">
                {CHATS.map((chat) => (
                  <div 
                    key={chat.id}
                    className="flex items-start gap-3 border-b p-3 transition-colors hover:bg-muted/50"
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
                    <AvatarImage src="https://i.pravatar.cc/150?img=5" alt="Марія Коваленко" />
                    <AvatarFallback>МК</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="font-semibold">Марія Коваленко</h3>
                    <p className="text-xs text-muted-foreground">Онлайн</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {MESSAGES.map((message) => (
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
                  />
                  <Button className="bg-gradient-purple rounded-full" size="icon">
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
