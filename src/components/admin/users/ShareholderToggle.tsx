
import { Switch } from "@/components/ui/switch";

interface ShareholderToggleProps {
  user: any;
  onToggleShareholder: (userId: string) => void;
}

export function ShareholderToggle({ user, onToggleShareholder }: ShareholderToggleProps) {
  // Засновник завжди є акціонером
  const getShareholderStatus = (user: any) => {
    const isFounder = user.founder_admin || user.phone_number === '0507068007';
    if (isFounder) {
      return true;
    }
    return Boolean(user.is_shareholder);
  };

  // Перемикач неактивний тільки для засновника
  const isToggleDisabled = (user: any) => {
    return user.founder_admin || user.phone_number === '0507068007';
  };

  return (
    <div className="flex items-center">
      <Switch
        checked={getShareholderStatus(user)}
        onCheckedChange={() => onToggleShareholder(user.id)}
        disabled={isToggleDisabled(user)}
      />
      {isToggleDisabled(user) && (
        <span className="text-xs text-muted-foreground ml-2">Засновник</span>
      )}
    </div>
  );
}
