import { cn } from "@/lib/utils";

interface Props {
  /** Tier id: silver | gold | platinum (or any custom). */
  tier?: string;
  /** Animation key from vip_tiers.banner_animation. */
  animation?: string;
  /** Custom user banner URL (image background overlay). */
  customBannerUrl?: string | null;
  /** Standard cover image (used as base). */
  coverUrl?: string | null;
  className?: string;
}

/**
 * Renders a VIP-styled animated banner overlay on top of a profile cover.
 * If user has a custom banner URL, it's used as the base image.
 */
export function VipAnimatedBanner({
  animation = "shimmer",
  customBannerUrl,
  coverUrl,
  className,
}: Props) {
  const baseUrl = customBannerUrl || coverUrl;

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {baseUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${baseUrl})` }}
        />
      )}
      {/* Animated overlay layer */}
      <div className={cn("absolute inset-0 pointer-events-none", `vip-anim-${animation}`)} />
      {/* Gradient mask towards background for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}