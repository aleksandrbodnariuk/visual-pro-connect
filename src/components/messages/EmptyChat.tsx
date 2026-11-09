import { useNavigate } from "react-router-dom";
import { MessageSquareText, PenSquare, Users, Lock, Zap, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyChatProps {
  onNewChat?: () => void;
}

export function EmptyChat({ onNewChat }: EmptyChatProps) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-accent/25 blur-2xl" aria-hidden />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-secondary text-accent-foreground shadow-card">
            <MessageSquareText className="h-11 w-11" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Ваші повідомлення</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Оберіть чат зі списку ліворуч або розпочніть нову розмову з друзями та партнерами.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {onNewChat && (
            <Button className="h-11 rounded-full px-5" onClick={onNewChat}>
              <PenSquare className="mr-2 h-4 w-4" /> Написати повідомлення
            </Button>
          )}
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={() => navigate("/friends")}>
            <Users className="mr-2 h-4 w-4" /> Знайти друзів
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5"><Lock className="h-3.5 w-3.5" /> Захищені діалоги</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5"><Zap className="h-3.5 w-3.5" /> Миттєві сповіщення</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5"><Paperclip className="h-3.5 w-3.5" /> Медіа та опитування</span>
        </div>
      </div>
    </div>
  );
}
