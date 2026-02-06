import { Switch } from "@/components/ui/switch";

interface SpecialistToggleProps {
  user: {
    id: string;
    is_specialist?: boolean;
  };
  onToggleSpecialist: (userId: string) => void;
}

export function SpecialistToggle({ user, onToggleSpecialist }: SpecialistToggleProps) {
  return (
    <Switch
      checked={Boolean(user.is_specialist)}
      onCheckedChange={() => onToggleSpecialist(user.id)}
      aria-label="Перемикач статусу фахівця"
    />
  );
}
