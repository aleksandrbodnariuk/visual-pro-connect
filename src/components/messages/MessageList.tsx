import { ReactNode, useState } from "react";
import { MessageActions } from "./MessageActions";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSender: boolean;
  isEdited?: boolean;
  editedAt?: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface MessageListProps {
  messages: Message[];
  emptyStateMessage?: ReactNode;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export function MessageList({ 
  messages, 
  emptyStateMessage,
  onEditMessage,
  onDeleteMessage 
}: MessageListProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isSender ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-start gap-1 group ${message.isSender ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.isSender
                        ? "bg-gradient-purple text-white"
                        : "bg-muted"
                    }`}
                  >
                    {/* Зображення вкладення */}
                    {message.attachmentUrl && message.attachmentType === 'image' && (
                      <img 
                        src={message.attachmentUrl} 
                        alt="Вкладення" 
                        className="max-w-[200px] rounded-lg cursor-pointer mb-2 hover:opacity-90 transition-opacity"
                        onClick={() => setZoomedImage(message.attachmentUrl!)}
                      />
                    )}
                    
                    {message.text && <p className="text-sm">{message.text}</p>}
                    
                    <div className={`mt-1 flex items-center gap-1 text-xs ${
                      message.isSender ? "justify-end text-white/70" : "text-muted-foreground"
                    }`}>
                      {message.isEdited && (
                        <span className="italic">(редаговано)</span>
                      )}
                      <span>{message.timestamp}</span>
                    </div>
                  </div>
                  {message.isSender && onEditMessage && onDeleteMessage && (
                    <MessageActions
                      messageId={message.id}
                      messageText={message.text}
                      onEdit={onEditMessage}
                      onDelete={onDeleteMessage}
                    />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground">
              {emptyStateMessage || "Початок розмови"}
            </div>
          )}
        </div>
      </div>

      {/* Модальне вікно для збільшеного зображення */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {zoomedImage && (
            <img 
              src={zoomedImage} 
              alt="Збільшене зображення" 
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
