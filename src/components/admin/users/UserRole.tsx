
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_ROLES = [
  "Учасник",
  "Акціонер", 
  "Модератор",
  "Адміністратор"
];

// Map DB roles to UI labels
const dbRoleToUiLabel = (roles: string[]): string => {
  if (roles.includes('admin')) return "Адміністратор";
  if (roles.includes('moderator')) return "Модератор";
  if (roles.includes('shareholder')) return "Акціонер";
  return "Учасник";
};

interface UserRoleProps {
  user: any;
  userRoles?: string[];
  onRoleChange: (userId: string, newRole: string) => void;
}

export function UserRole({ user, userRoles, onRoleChange }: UserRoleProps) {
  const getUserRole = () => {
    if (user.founder_admin || user.phone_number === '0507068007') return "Засновник";
    if (userRoles && userRoles.length > 0) {
      return dbRoleToUiLabel(userRoles);
    }
    if (user.is_admin || user.isAdmin) return "Адміністратор";
    if (user.is_shareholder || user.isShareHolder) return "Акціонер";
    return "Учасник";
  };

  const isFounder = user.founder_admin || user.phone_number === '0507068007';

  return (
    <div>
      {!isFounder ? (
        <Select 
          value={getUserRole()} 
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
