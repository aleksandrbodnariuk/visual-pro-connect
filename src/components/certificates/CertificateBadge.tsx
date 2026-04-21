import { Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserCertificate, type UserCertificate } from "@/hooks/certificates/useUserCertificate";
import { cn } from "@/lib/utils";

interface CertificateBadgeProps {
  userId: string | undefined | null;
  /** Visual size preset. */
  size?: "sm" | "md" | "lg";
  /** Optional additional classes for the wrapper (positioning, etc.). */
  className?: string;
  /** Pre-fetched certificate (avoids extra request when parent already has it). */
  certificate?: UserCertificate | null;
}

/**
 * Artistic certificate badge displayed next to a user's avatar.
 * Visible to all authenticated users when the user has an active certificate.
 */
export function CertificateBadge({ userId, size = "md", className, certificate: providedCertificate }: CertificateBadgeProps) {
  // Only fetch when no pre-loaded certificate is supplied
  const { certificate: fetched } = useUserCertificate(providedCertificate === undefined ? userId : null);
  const certificate = providedCertificate !== undefined ? providedCertificate : fetched;

  if (!certificate || !certificate.is_active || certificate.discount_value <= 0) return null;

  const label =
    certificate.discount_type === "percent"
      ? `${certificate.discount_value}%`
      : certificate.discount_type === "uah"
      ? `${certificate.discount_value}₴`
      : `$${certificate.discount_value}`;

  const tooltipText = `Сертифікат на знижку ${label} на послуги фото, відео та музика${
    certificate.note ? ` — ${certificate.note}` : ""
  }`;

  const sizeClasses = {
    sm: "h-6 px-2 text-[10px] gap-1",
    md: "h-7 px-2.5 text-xs gap-1.5",
    lg: "h-9 px-3 text-sm gap-2",
  }[size];

  const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" }[size];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center rounded-full font-semibold cursor-default select-none",
              "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500",
              "text-amber-950 shadow-md ring-2 ring-amber-300/40",
              "animate-fade-in transition-transform hover:scale-105",
              "[box-shadow:0_0_12px_hsl(45_90%_60%_/_0.4)]",
              sizeClasses,
              className
            )}
            role="img"
            aria-label={tooltipText}
          >
            <Award className={cn(iconSize, "drop-shadow-sm")} fill="currentColor" strokeWidth={1.5} />
            <span className="font-bold tracking-tight">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm font-medium">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}