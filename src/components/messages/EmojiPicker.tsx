import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const POPULAR_EMOJIS = [
  // Смайлики
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
  "😇", "🙂", "😉", "😍", "🥰", "😘", "😗", "😚",
  "😋", "😛", "😜", "🤪", "😝", "🤗", "🤔", "🤭",
  // Жести
  "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
  "👏", "🙌", "🤝", "🙏", "💪", "👋", "🤚", "✋",
  // Серця
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
  // Обʼєкти та символи
  "🎉", "🎊", "🎁", "🔥", "⭐", "💫", "✨", "💥",
  "💯", "🏆", "🎯", "💡", "🌟", "🌈", "☀️", "🌙"
];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
}

export function EmojiPicker({ onSelectEmoji }: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="grid grid-cols-8 gap-1">
          {POPULAR_EMOJIS.map((emoji, index) => (
            <button
              key={index}
              className="flex h-8 w-8 items-center justify-center rounded text-xl hover:bg-muted transition-colors"
              onClick={() => onSelectEmoji(emoji)}
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
