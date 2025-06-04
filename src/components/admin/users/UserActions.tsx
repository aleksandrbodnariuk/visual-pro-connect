
import { Button } from "@/components/ui/button";

interface UserActionsProps {
  user: any;
  onDeleteUser: (userId: string) => void;
}

export function UserActions({ user, onDeleteUser }: UserActionsProps) {
  const isFounder = user.founder_admin || user.phone_number === '0507068007';

  return (
    <div className="flex space-x-2">
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
