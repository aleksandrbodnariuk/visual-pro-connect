import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChatList } from "@/components/messages/ChatList";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { MessageList } from "@/components/messages/MessageList";
import { MessageInput } from "@/components/messages/MessageInput";
import { EmptyChat } from "@/components/messages/EmptyChat";
import { MessagesService, ChatItem, Message } from "@/components/messages/MessagesService";
import { playNotificationSound } from "@/lib/sounds";

export default function Messages() {
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const activeChatRef = useRef<ChatItem | null>(null);

  // Тримаємо ref актуальним
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    const initializeMessages = async () => {
      try {
        // Отримуємо сесію користувача з Supabase Auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Помилка при отриманні сесії:", sessionError);
          toast.error("Помилка авторизації");
          setIsLoading(false);
          return;
        }
        
        if (!session?.user) {
          toast.error("Будь ласка, увійдіть в систему для перегляду повідомлень");
          setIsLoading(false);
          navigate("/auth");
          return;
        }
        
        const receiverId = localStorage.getItem("currentChatReceiverId");
        setCurrentUser(session.user);
        
        // Завантажуємо всі чати та повідомлення
        await loadChatsAndMessages(session.user.id, receiverId);
      } catch (error) {
        console.error("Помилка ініціалізації повідомлень:", error);
        toast.error("Не вдалося завантажити повідомлення");
        setIsLoading(false);
      }
    };
    
    initializeMessages();
  }, [navigate]);
  
  // Завантаження чатів та повідомлень
  const loadChatsAndMessages = async (userId: string, receiverId: string | null) => {
    try {
      const { chats: loadedChats, activeChat: selectedChat } = 
        await MessagesService.fetchChatsAndMessages(userId, receiverId);
      
      setChats(loadedChats);
      
      if (selectedChat) {
        setActiveChat(selectedChat);
        setMessages(selectedChat.messages);
      }
    } catch (error) {
      console.error("Помилка при завантаженні чатів:", error);
      toast.error("Не вдалося завантажити повідомлення");
    } finally {
      setIsLoading(false);
      // Clear the temporary receiverId from localStorage
      localStorage.removeItem("currentChatReceiverId");
    }
  };

  const handleSendMessage = async (messageText: string, attachmentUrl?: string, attachmentType?: string) => {
    if (!activeChat || !currentUser) return;
    
    const { success, newMessage } = 
      await MessagesService.sendMessage(currentUser, activeChat.user.id, messageText, attachmentUrl, attachmentType);
    
    if (success && newMessage) {
      // Оновлюємо локальний стан
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      // Оновлюємо останнє повідомлення в чаті
      const lastMessageText = messageText || (attachmentUrl ? "📷 Фото" : "");
      const updatedChats = chats.map(chat => 
        chat.id === activeChat.id 
          ? {
              ...chat,
              messages: updatedMessages,
              lastMessage: {
                text: lastMessageText,
                timestamp: "Щойно"
              }
            }
          : chat
      );
      setChats(updatedChats);
    }
  };
  
  const selectChat = async (chat: ChatItem) => {
    setActiveChat(chat);
    setMessages(chat.messages);
    
    // Позначаємо повідомлення як прочитані в БД
    if (currentUser) {
      const success = await MessagesService.markMessagesAsRead(currentUser.id, chat.user.id);
      // Сповіщаємо всі компоненти про оновлення лічильника
      if (success) {
        window.dispatchEvent(new CustomEvent('messages-read'));
      }
    }
    
    // Оновлюємо кількість непрочитаних повідомлень
    const updatedChats = chats.map(c => 
      c.id === chat.id 
        ? {...c, user: {...c.user, unreadCount: 0}}
        : c
    );
    setChats(updatedChats);
  };

  // Realtime підписка на нові повідомлення
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Отримуємо профіль відправника
          const { data: profiles } = await supabase
            .rpc('get_safe_public_profiles_by_ids', { _ids: [newMsg.sender_id] });
          
          const senderProfile = profiles?.[0];
          const currentActiveChat = activeChatRef.current;

          const messageForUI: Message = {
            id: newMsg.id,
            text: newMsg.content,
            timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSender: false,
            attachmentUrl: newMsg.attachment_url || undefined,
            attachmentType: newMsg.attachment_type || undefined
          };

          // Якщо це активний чат - додаємо повідомлення і позначаємо прочитаним
          if (currentActiveChat && currentActiveChat.user.id === newMsg.sender_id) {
            setMessages(prev => [...prev, messageForUI]);
            await MessagesService.markMessagesAsRead(currentUser.id, newMsg.sender_id);
            // Примусово оновлюємо глобальний лічильник
            window.dispatchEvent(new CustomEvent('messages-read'));
          } else {
            // Інакше - оновлюємо unreadCount у списку чатів та грає звук
            playNotificationSound();
          }

          // Оновлюємо список чатів
          setChats(prevChats => {
            const existingChatIndex = prevChats.findIndex(c => c.user.id === newMsg.sender_id);
            
            if (existingChatIndex !== -1) {
              return prevChats.map((chat, idx) => {
                if (idx === existingChatIndex) {
                  const isCurrentActive = currentActiveChat?.user.id === newMsg.sender_id;
                  return {
                    ...chat,
                    messages: [...chat.messages, messageForUI],
                    lastMessage: {
                      text: newMsg.content || (newMsg.attachment_url ? "📷 Фото" : ""),
                      timestamp: "Щойно"
                    },
                    user: {
                      ...chat.user,
                      unreadCount: isCurrentActive ? 0 : chat.user.unreadCount + 1
                    }
                  };
                }
                return chat;
              });
            } else {
              // Новий чат
              const newChat: ChatItem = {
                id: `chat-${newMsg.sender_id}`,
                user: {
                  id: newMsg.sender_id,
                  name: senderProfile?.full_name || 'Користувач',
                  username: 'user',
                  avatarUrl: senderProfile?.avatar_url || '',
                  lastSeen: 'Онлайн',
                  unreadCount: 1
                },
                messages: [messageForUI],
                lastMessage: {
                  text: newMsg.content || "📷 Фото",
                  timestamp: "Щойно"
                }
              };
              return [newChat, ...prevChats];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const handleEditMessage = async (messageId: string, newText: string) => {
    const success = await MessagesService.editMessage(messageId, newText);
    if (success) {
      const updatedMessages = messages.map(msg =>
        msg.id === messageId
          ? { ...msg, text: newText, isEdited: true }
          : msg
      );
      setMessages(updatedMessages);

      // Оновлюємо чати якщо це останнє повідомлення
      if (activeChat) {
        const updatedChats = chats.map(chat =>
          chat.id === activeChat.id
            ? { ...chat, messages: updatedMessages }
            : chat
        );
        setChats(updatedChats);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const success = await MessagesService.deleteMessage(messageId);
    if (success) {
      const updatedMessages = messages.filter(msg => msg.id !== messageId);
      setMessages(updatedMessages);

      // Оновлюємо чати
      if (activeChat) {
        const updatedChats = chats.map(chat =>
          chat.id === activeChat.id
            ? {
                ...chat,
                messages: updatedMessages,
                lastMessage: updatedMessages.length > 0
                  ? { text: updatedMessages[updatedMessages.length - 1].text, timestamp: updatedMessages[updatedMessages.length - 1].timestamp }
                  : { text: "Почніть розмову", timestamp: "" }
              }
            : chat
        );
        setChats(updatedChats);
      }
    }
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
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar />
      
      <div className="container mt-8 pb-4 md:pb-10 px-2 sm:px-4 md:px-6">
        <div className="rounded-xl border">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            {/* Список чатів */}
            <div className="border-r md:col-span-1">
              <ChatList 
                chats={chats} 
                activeChat={activeChat} 
                onSelectChat={selectChat} 
              />
            </div>
            
            {/* Вікно чату */}
            <div className="flex h-[80vh] flex-col md:col-span-2 lg:col-span-3">
              {activeChat ? (
                <>
                  <ChatHeader user={activeChat.user} />
                  
                  <MessageList 
                    messages={messages} 
                    emptyStateMessage={`Початок розмови з ${activeChat.user.name}`}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                  />
                  
                  <MessageInput onSendMessage={handleSendMessage} />
                </>
              ) : (
                <EmptyChat />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
