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
  const currentUserRef = useRef<any>(null);

  // Тримаємо refs актуальними
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const initializeMessages = async () => {
      try {
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
        
        await loadChatsAndMessages(session.user.id, receiverId);
      } catch (error) {
        console.error("Помилка ініціалізації повідомлень:", error);
        toast.error("Не вдалося завантажити повідомлення");
        setIsLoading(false);
      }
    };
    
    initializeMessages();

  }, [navigate]);

  // Окремий useEffect для force-reload з правильними залежностями
  useEffect(() => {
    const handleForceReload = () => {
      const uid = currentUserRef.current?.id;
      if (uid) {
        const receiverId = localStorage.getItem("currentChatReceiverId");
        loadChatsAndMessages(uid, receiverId);
      }
    };
    window.addEventListener('messages-force-reload', handleForceReload);
    return () => window.removeEventListener('messages-force-reload', handleForceReload);
  }, []);
  
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

  // Обробник "Назад" для мобільних пристроїв
  const handleBackToList = () => {
    setActiveChat(null);
  };

  // Функція перезавантаження повідомлень активного чату з БД
  const reloadActiveChat = useCallback(async () => {
    const uid = currentUserRef.current?.id;
    if (!uid) return;
    
    const currentActiveChat = activeChatRef.current;
    if (!currentActiveChat) return;
    
    // Перезавантажуємо повідомлення з БД для активного чату
    const { data: messageData } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at, is_edited, edited_at, attachment_url, attachment_type')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${currentActiveChat.user.id}),and(sender_id.eq.${currentActiveChat.user.id},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: true });
    
    if (messageData) {
      const updatedMessages: Message[] = messageData.map(msg => ({
        id: msg.id,
        text: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSender: msg.sender_id === uid,
        isEdited: msg.is_edited || false,
        editedAt: msg.edited_at ? new Date(msg.edited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        attachmentUrl: msg.attachment_url || undefined,
        attachmentType: msg.attachment_type || undefined
      }));
      setMessages(updatedMessages);
    }
  }, []);

  // Слухаємо подію від useUnreadMessages (єдина підписка на receiver_id)
  useEffect(() => {
    const handleNewMessage = async () => {
      const currentActiveChat = activeChatRef.current;
      const myId = currentUserRef.current?.id;
      
      // Якщо чат відкритий — спочатку позначаємо як прочитані, потім оновлюємо списки
      if (currentActiveChat && myId) {
        await MessagesService.markMessagesAsRead(myId, currentActiveChat.user.id);
        window.dispatchEvent(new CustomEvent('messages-read'));
      }
      
      await reloadActiveChat();
      await reloadChatList();
      
      if (!currentActiveChat) {
        playNotificationSound();
      }
    };

    window.addEventListener('new-message-received', handleNewMessage);
    return () => window.removeEventListener('new-message-received', handleNewMessage);
  }, [reloadActiveChat]);

  // Канал для повідомлень ВІД мене (інша вкладка / cross-tab sync)
  useEffect(() => {
    if (!currentUser?.id) return;

    const uid = currentUser.id;
    const suffix = Math.random().toString(36).substring(7);

    const sendChannel = supabase
      .channel(`msg-send-${uid}-${suffix}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `sender_id=eq.${uid}`
      }, async () => {
        await reloadActiveChat();
        await reloadChatList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sendChannel);
    };
  }, [currentUser?.id, reloadActiveChat]);

  // ── Polling fallback (3s) ──
  useEffect(() => {
    if (!currentUser?.id) return;

    const interval = setInterval(async () => {
      if (document.hidden) return;
      if (!activeChatRef.current) return;
      await reloadActiveChat();
      // Mark messages as read while chat is open
      const uid = currentUserRef.current?.id;
      const chatUserId = activeChatRef.current?.user.id;
      if (uid && chatUserId) {
        await MessagesService.markMessagesAsRead(uid, chatUserId);
        window.dispatchEvent(new CustomEvent('messages-read'));
        // Оновлюємо список чатів щоб прибрати бейдж непрочитаних
        await reloadChatList();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser?.id, reloadActiveChat]);

  // Перезавантаження списку чатів
  const reloadChatList = useCallback(async () => {
    const uid = currentUserRef.current?.id;
    if (!uid) return;
    const { chats: loadedChats } = await MessagesService.fetchChatsAndMessages(uid, null);
    setChats(loadedChats);
  }, []);

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
            {/* Список чатів - приховувати на мобільному коли є activeChat */}
            <div className={`border-r md:col-span-1 ${activeChat ? 'hidden md:block' : 'block'}`}>
              <ChatList 
                chats={chats} 
                activeChat={activeChat} 
                onSelectChat={selectChat} 
              />
            </div>
            
            {/* Вікно чату - показувати тільки коли є activeChat на мобільному */}
            <div className={`flex h-[calc(100vh-8rem)] md:h-[80vh] flex-col md:col-span-2 lg:col-span-3 pb-16 md:pb-0 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
              {activeChat ? (
                <>
                  <ChatHeader user={activeChat.user} onBack={handleBackToList} />
                  
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
