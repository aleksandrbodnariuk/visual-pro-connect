
import { Button } from "@/components/ui/button";
import { Ban, ShieldCheck } from "lucide-react";

interface UserActionsProps {
  user: any;
  onDeleteUser: (userId: string) => void;
  onToggleBlock?: (userId: string) => void;
}

export function UserActions({ user, onDeleteUser, onToggleBlock }: UserActionsProps) {
  const isFounder = user.founder_admin || user.phone_number === '0507068007';
  const isBlocked = Boolean(user.is_blocked);

  return (
    <div className="flex space-x-2">
      {!isFounder && onToggleBlock && (
        <Button
          variant={isBlocked ? "outline" : "secondary"}
          size="sm"
          onClick={() => onToggleBlock(user.id)}
          title={isBlocked ? "Розблокувати" : "Заблокувати"}
        >
          {isBlocked ? <ShieldCheck className="h-4 w-4 mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
          {isBlocked ? "Розблок." : "Блок."}
        </Button>
      )}
      {!isFounder && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteUser(user.id)}
        >
          Видалити
        </Button>
      )}
    </div>
  );
}
