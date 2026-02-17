import { useState, useRef } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const MESSAGE_REACTIONS = [
  { emoji: '❤️', label: 'Люблю' },
  { emoji: '😆', label: 'Ха-ха' },
  { emoji: '😮', label: 'Вау' },
  { emoji: '😢', label: 'Сумно' },
  { emoji: '😡', label: 'Обурення' },
  { emoji: '👍', label: 'Клас' },
];

interface MessageReactionPickerProps {
  onSelect: (emoji: string) => void;
  existingReaction?: string | null;
}

export function MessageReactionPicker({ onSelect, existingReaction }: MessageReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleShow = () => {
    clearTimer();
    timeoutRef.current = setTimeout(() => setShowPicker(true), 200);
  };

  const scheduleHide = () => {
    clearTimer();
    timeoutRef.current = setTimeout(() => setShowPicker(false), 300);
  };

  const handleSelect = (emoji: string) => {
    clearTimer();
    setShowPicker(false);
    onSelect(emoji);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={scheduleShow}
      onMouseLeave={scheduleHide}
    >
      <button
        type="button"
        className="h-6 w-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        onClick={() => setShowPicker(!showPicker)}
      >
        {existingReaction ? (
          <span className="text-sm">{existingReaction}</span>
        ) : (
          <Smile className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {showPicker && (
        <div
          className="absolute bottom-full mb-1 z-50"
          onMouseEnter={clearTimer}
          onMouseLeave={scheduleHide}
        >
          <div className="flex items-center gap-0.5 bg-popover border border-border rounded-full px-2 py-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200 whitespace-nowrap">
            {MESSAGE_REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleSelect(reaction.emoji)}
                className={cn(
                  "text-xl hover:scale-125 transition-transform duration-150 px-0.5 cursor-pointer",
                  existingReaction === reaction.emoji && "scale-125 bg-accent rounded-full"
                )}
                title={reaction.label}
                type="button"
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
