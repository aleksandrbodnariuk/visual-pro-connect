
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVAILABLE_TITLES = [
  "Акціонер",
  "Магнат", 
  "Барон",
  "Граф", 
  "Маркіз",
  "Лорд",
  "Герцог",
  "Імператор"
];

interface UserTitleProps {
  user: any;
  onTitleChange: (userId: string, newTitle: string) => void;
}

export function UserTitle({ user, onTitleChange }: UserTitleProps) {
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
        <Select 
          value={user.title || "Акціонер"} 
          onValueChange={(value) => onTitleChange(user.id, value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_TITLES.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
  );
}
