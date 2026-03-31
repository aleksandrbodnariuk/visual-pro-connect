import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TITLE_THRESHOLDS } from "@/lib/shareholderRules";

// Titles that require approval (level >= 2, i.e. Барон and above)
const APPROVAL_TITLES = TITLE_THRESHOLDS
  .filter(t => t.level >= 2)
  .sort((a, b) => a.level - b.level);

interface TitleApprovalDropdownProps {
  userId: string;
  approvedLevel: number; // current max approved level for this user
  currentShareLevel: number; // level based on share percentage
  onApprove: (userId: string, level: number) => void;
}

export function TitleApprovalDropdown({
  userId,
  approvedLevel,
  currentShareLevel,
  onApprove,
}: TitleApprovalDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (level: number) => {
    // If already approved at this level, revoke (set to level below)
    if (approvedLevel >= level) {
      onApprove(userId, level - 1);
    } else {
      onApprove(userId, level);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <ChevronDown className="h-3.5 w-3.5" />
          Перехід
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
          Дозволити перехід на титул
        </p>
        <div className="space-y-1">
          {APPROVAL_TITLES.map((title) => {
            const isApproved = approvedLevel >= title.level;
            const hasEnoughShares = currentShareLevel >= title.level;

            return (
              <button
                key={title.level}
                onClick={() => handleToggle(title.level)}
                className={`flex items-center justify-between w-full rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  isApproved ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{title.title}</span>
                  <span className="text-xs text-muted-foreground">
                    (≥{title.minPercent}%)
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {!hasEnoughShares && (
                    <span className="text-[10px] text-muted-foreground/60">
                      мало акцій
                    </span>
                  )}
                  {isApproved && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
