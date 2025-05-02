
import { useState, useEffect } from "react";
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

  useEffect(() => {
    // Отримуємо дані поточного користувача
    const user = localStorage.getItem("currentUser");
    const receiverId = localStorage.getItem("currentChatReceiverId");
    
    if (user) {
      const userData = JSON.parse(user);
      setCurrentUser(userData);
      
      // Завантажуємо всі чати та повідомлення
      loadChatsAndMessages(userData.id, receiverId);
    }
  }, []);
  
  // Завантаження чатів та повідомлень
  const loadChatsAndMessages = async (userId: string, receiverId: string | null) => {
    setIsLoading(true);
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
