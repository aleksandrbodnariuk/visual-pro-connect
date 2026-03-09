
import { Badge } from "@/components/ui/badge";

interface UserTitleProps {
  user: any;
  onTitleChange?: (userId: string, newTitle: string) => void;
}

export function UserTitle({ user }: UserTitleProps) {
  const getShareholderStatus = (user: any) => {
    if (user.founder_admin || user.phone_number === '0507068007') {
      return true;
    }
    return Boolean(user.is_shareholder);
  };

  const isShareholder = getShareholderStatus(user) || user.founder_admin;

  return (
    <div>
      {isShareholder ? (
        <Badge variant="secondary">
          {user.title || '—'}
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
  );
}
