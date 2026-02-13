import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Подобається' },
  { type: 'love', emoji: '❤️', label: 'Люблю' },
  { type: 'haha', emoji: '😆', label: 'Ха-ха' },
  { type: 'wow', emoji: '😮', label: 'Вау' },
  { type: 'sad', emoji: '😢', label: 'Сумно' },
  { type: 'angry', emoji: '😡', label: 'Обурення' },
];

export const getReactionEmoji = (type: ReactionType | string): string => {
  return REACTIONS.find(r => r.type === type)?.emoji || '👍';
};

export const getReactionLabel = (type: ReactionType | string): string => {
  return REACTIONS.find(r => r.type === type)?.label || 'Подобається';
};

export const getReactionColor = (type: ReactionType | string): string => {
  switch (type) {
    case 'like': return 'text-blue-500';
    case 'love': return 'text-red-500';
    case 'haha': return 'text-yellow-500';
    case 'wow': return 'text-yellow-500';
    case 'sad': return 'text-yellow-500';
    case 'angry': return 'text-orange-500';
    default: return 'text-blue-500';
  }
};

interface ReactionPickerProps {
  onSelect: (type: ReactionType) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function ReactionPicker({ onSelect, children, disabled }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPickerPos({
          top: rect.top - 50,
          left: rect.left + rect.width / 2,
        });
      }
      setShowPicker(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPicker(false), 300);
  };

  const handleSelect = (type: ReactionType) => {
    setShowPicker(false);
    onSelect(type);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showPicker && (
        <div
          className="fixed z-[9999]"
          style={{
            top: `${pickerPos.top}px`,
            left: `${pickerPos.left}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-1 bg-popover border border-border rounded-full px-2 py-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.type}
                onClick={() => handleSelect(reaction.type)}
                className="text-2xl hover:scale-125 transition-transform duration-150 px-0.5 cursor-pointer"
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
