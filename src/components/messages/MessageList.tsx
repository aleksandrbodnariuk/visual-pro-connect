
import { ReactNode } from "react";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSender: boolean;
}

interface MessageListProps {
  messages: Message[];
  emptyStateMessage?: ReactNode;
}

export function MessageList({ messages, emptyStateMessage }: MessageListProps) {
  return (
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
            {emptyStateMessage || "Початок розмови"}
          </div>
        )}
      </div>
    </div>
  );
}
