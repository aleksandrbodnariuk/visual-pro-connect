
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_ROLES = [
  "Учасник",
  "Акціонер", 
  "Модератор",
  "Адміністратор"
];

interface UserRoleProps {
  user: any;
  onRoleChange: (userId: string, newRole: string) => void;
}

export function UserRole({ user, onRoleChange }: UserRoleProps) {
  const getUserRole = (user: any) => {
    if (user.founder_admin || user.phone_number === '0507068007') return "Засновник";
    if (user.is_admin || user.isAdmin) return "Адміністратор";
    if (user.is_shareholder || user.isShareHolder) return "Акціонер";
    return user.role || "Учасник";
  };

  const isFounder = user.founder_admin || user.phone_number === '0507068007';

  return (
    <div>
      {!isFounder ? (
        <Select 
          value={getUserRole(user)} 
          onValueChange={(value) => onRoleChange(user.id, value)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="destructive">Засновник</Badge>
      )}
    </div>
  );
}
