import { Switch } from "@/components/ui/switch";

interface RepresentativeToggleProps {
  isRepresentative: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function RepresentativeToggle({ isRepresentative, onToggle, disabled }: RepresentativeToggleProps) {
  return (
    <Switch
      checked={isRepresentative}
      onCheckedChange={onToggle}
      disabled={disabled}
      aria-label="Перемикач статусу представника"
    />
  );
}
