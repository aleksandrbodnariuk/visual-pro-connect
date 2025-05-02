
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [messageText, setMessageText] = useState("");

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
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
  );
}
