
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Trash2, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type?: 'direct' | 'group';
  memberCount?: number;
}

interface ChatListProps {
  chats: ChatItem[];
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
  onDeleteChat?: (chat: ChatItem) => void;
  isLoading?: boolean;
  onNewChat?: () => void;
}

export function ChatList({ chats, activeChat, onSelectChat, onDeleteChat, isLoading, onNewChat }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [chatToDelete, setChatToDelete] = useState<ChatItem | null>(null);

  const filteredChats = chats
    .filter(chat =>
      chat.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    // Закріплюємо групи зверху (як у Viber), зберігаючи відносний порядок
    .sort((a, b) => {
      const aGroup = a.type === 'group' ? 1 : 0;
      const bGroup = b.type === 'group' ? 1 : 0;
      return bGroup - aGroup;
    });

  const hasGroups = filteredChats.some(c => c.type === 'group');
  const hasDirects = filteredChats.some(c => c.type !== 'group');
  let directSectionRendered = false;

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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Пошук повідомлень"
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {onNewChat && (
            <Button
              size="icon"
              variant="default"
              onClick={onNewChat}
              title="Новий чат"
              className="shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="h-[calc(100vh-12rem)] md:h-[calc(80vh-120px)] overflow-y-auto">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
            const online = isUserOnline(chat.user.lastSeen);
            const isGroup = chat.type === 'group';
            let sectionHeader: JSX.Element | null = null;
            if (isGroup && !sectionHeader && filteredChats.indexOf(chat) === 0 && hasGroups) {
              sectionHeader = (
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 border-b">
                  Групи
                </div>
              );
            }
            if (!isGroup && !directSectionRendered && hasGroups && hasDirects) {
              directSectionRendered = true;
              sectionHeader = (
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 border-b border-t">
                  Чати
                </div>
              );
            }
            return (
              <div key={chat.id}>
                {sectionHeader}
                <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div 
                    className={`flex items-start gap-3 border-b p-3 transition-colors hover:bg-muted/50 cursor-pointer ${activeChat?.id === chat.id ? 'bg-muted/80' : ''} ${isGroup ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary' : ''}`}
                    onClick={() => onSelectChat(chat)}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chat.user.avatarUrl} alt={chat.user.name} />
                        <AvatarFallback>
                          {isGroup ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            chat.user.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {!isGroup && online && (
                        <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-1.5 truncate">
                          {isGroup && <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <span className="truncate">{chat.user.name}</span>
                        </h3>
                        <span className="text-xs text-muted-foreground">{chat.lastMessage.timestamp}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm text-muted-foreground">
                          {isGroup && chat.memberCount ? `${chat.memberCount} уч. · ` : ''}
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
                    {chat.type === 'group' ? 'Вийти з групи' : 'Видалити чат'}
                  </ContextMenuItem>
                </ContextMenuContent>
                </ContextMenu>
              </div>
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
