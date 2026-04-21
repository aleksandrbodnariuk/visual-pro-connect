import { Crown, Star, Gem, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserVip, type UserVipMembership } from "@/hooks/vip/useUserVip";
import { useVipTiers } from "@/hooks/vip/useVipTiers";
import { getVipTier } from "@/lib/vipTiers";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { Crown, Star, Gem };

interface Props {
  userId: string | undefined | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Pre-fetched membership to avoid extra request. */
  membership?: UserVipMembership | null;
}

/**
 * VIP badge displayed next to a user's avatar/name.
 * Visible only when the user has an active VIP membership.
 */
export function VipBadge({ userId, size = "md", className, membership: provided }: Props) {
  const { vip: fetched } = useUserVip(provided === undefined ? userId : null);
  const vip = provided !== undefined ? provided : fetched;
  const { tiers } = useVipTiers(false);

  if (!vip) return null;

  const tier = getVipTier(vip.tier, tiers);
  if (!tier) return null;

  const Icon = ICONS[tier.badge_icon] || Crown;

  const sizeClasses = {
    sm: "h-6 px-2 text-[10px] gap-1",
    md: "h-7 px-2.5 text-xs gap-1.5",
    lg: "h-9 px-3 text-sm gap-2",
  }[size];
  const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" }[size];

  const tooltip = `${tier.label}${
    !vip.is_lifetime && vip.expires_at
      ? ` — діє до ${new Date(vip.expires_at).toLocaleDateString("uk")}`
      : vip.is_lifetime
      ? " — назавжди"
      : ""
  }`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center rounded-full font-bold cursor-default select-none",
              "bg-gradient-to-br text-white shadow-md ring-2 ring-white/30",
              "animate-fade-in transition-transform hover:scale-110",
              "vip-badge-glow",
              tier.gradient,
              sizeClasses,
              className
            )}
            role="img"
            aria-label={tooltip}
          >
            <Icon className={cn(iconSize, "drop-shadow-sm")} fill="currentColor" strokeWidth={1.5} />
            <span className="tracking-tight uppercase">VIP</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm font-medium">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}