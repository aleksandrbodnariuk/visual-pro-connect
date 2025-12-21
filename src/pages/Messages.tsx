import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChatList } from "@/components/messages/ChatList";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { MessageList } from "@/components/messages/MessageList";
import { MessageInput } from "@/components/messages/MessageInput";
import { EmptyChat } from "@/components/messages/EmptyChat";
import { MessagesService, ChatItem } from "@/components/messages/MessagesService";

export default function Messages() {
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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

  const handleSendMessage = async (messageText: string) => {
    if (!activeChat || !currentUser) return;
    
    const { success, newMessage } = 
      await MessagesService.sendMessage(currentUser, activeChat.user.id, messageText);
    
    if (success && newMessage) {
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
    }
  };
  
  const selectChat = (chat: ChatItem) => {
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
