import { useRef, useState, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onRefresh: () => void | Promise<void>;
  className?: string;
  children: ReactNode;
}

const THRESHOLD = 70;

/** Scroll container with touch pull-to-refresh (mobile only; desktop unaffected). */
export function PullToRefresh({ onRefresh, className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing || (ref.current?.scrollTop ?? 0) > 0) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const d = e.touches[0].clientY - startY.current;
    if (d <= 0 || (ref.current?.scrollTop ?? 0) > 0) { setPull(0); return; }
    setPull(Math.min(d * 0.5, 110));
  };
  const onTouchEnd = async () => {
    const reached = pull >= THRESHOLD;
    startY.current = null;
    if (!reached) { setPull(0); return; }
    setRefreshing(true);
    setPull(56);
    try { await onRefresh(); } finally {
      setTimeout(() => { setRefreshing(false); setPull(0); }, 400);
    }
  };

  return (
    <div ref={ref} className={className} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-end justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: pull }}
        aria-live="polite"
      >
        {pull > 0 && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw
              className={cn("h-4 w-4 text-primary", refreshing && "animate-spin")}
              style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
            />
            {refreshing ? "Оновлення…" : pull >= THRESHOLD ? "Відпустіть, щоб оновити" : "Потягніть, щоб оновити"}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
