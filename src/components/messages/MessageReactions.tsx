import { cn } from "@/lib/utils";

interface Reaction {
  emoji: string;
  users: string[];
  isOwn: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
}

export function MessageReactions({ reactions, onToggle }: MessageReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onToggle(reaction.emoji)}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border transition-colors cursor-pointer",
            reaction.isOwn
              ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
              : "bg-muted border-border hover:bg-accent"
          )}
          type="button"
        >
          <span className="text-sm">{reaction.emoji}</span>
          {reaction.users.length > 1 && (
            <span className="text-muted-foreground">{reaction.users.length}</span>
          )}
        </button>
      ))}
    </div>
  );
}
