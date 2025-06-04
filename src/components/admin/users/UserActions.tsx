
import { Button } from "@/components/ui/button";

interface UserActionsProps {
  user: any;
  onToggleAdmin: (userId: string, currentStatus: boolean) => void;
  onDeleteUser: (userId: string) => void;
}

export function UserActions({ user, onToggleAdmin, onDeleteUser }: UserActionsProps) {
  const isFounder = user.founder_admin || user.phone_number === '0507068007';

  return (
    <div className="flex space-x-2">
      {!isFounder && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleAdmin(user.id, user.is_admin || user.isAdmin)}
        >
          {user.is_admin || user.isAdmin ? 'Зняти адміна' : 'Зробити адміном'}
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
