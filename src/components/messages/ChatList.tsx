
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DeleteMessageDialog } from "@/components/messages/DeleteMessageDialog";
import { isUserOnline } from "@/lib/onlineStatus";

interface ChatItem {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
    lastSeen: string;
    unreadCount: number;
  };
  lastMessage: {
    text: string;
    timestamp: string;
  };
  messages: any[];
}

interface ChatListProps {
  chats: ChatItem[];
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
  onDeleteChat?: (chat: ChatItem) => void;
  isLoading?: boolean;
}

export function ChatList({ chats, activeChat, onSelectChat, onDeleteChat, isLoading }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [chatToDelete, setChatToDelete] = useState<ChatItem | null>(null);

  const filteredChats = chats.filter(chat => 
    chat.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <p>Завантаження чатів...</p>
      </div>
    );
  }

  return (
    <>
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
      
      <div className="h-[calc(100vh-12rem)] md:h-[calc(80vh-120px)] overflow-y-auto">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
            const online = isUserOnline(chat.user.lastSeen);
            return (
              <ContextMenu key={chat.id}>
                <ContextMenuTrigger asChild>
                  <div 
                    className={`flex items-start gap-3 border-b p-3 transition-colors hover:bg-muted/50 cursor-pointer ${activeChat?.id === chat.id ? 'bg-muted/80' : ''}`}
                    onClick={() => onSelectChat(chat)}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chat.user.avatarUrl} alt={chat.user.name} />
                        <AvatarFallback>
                          {chat.user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {online && (
                        <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                    </div>
                    
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
                          <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                            {chat.user.unreadCount > 9 ? "9+" : chat.user.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setChatToDelete(chat)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Видалити чат
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Немає чатів для відображення
          </div>
        )}
      </div>

      <DeleteMessageDialog
        open={!!chatToDelete}
        onOpenChange={(open) => !open && setChatToDelete(null)}
        onConfirm={() => {
          if (chatToDelete && onDeleteChat) {
            onDeleteChat(chatToDelete);
          }
          setChatToDelete(null);
        }}
      />
    </>
  );
}
