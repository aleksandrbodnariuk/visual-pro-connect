import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LikersTooltipProps {
  names: string[];
  children: React.ReactNode;
}

export function LikersTooltip({ names, children }: LikersTooltipProps) {
  if (names.length === 0) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-[200px] bg-foreground text-background text-xs px-3 py-2 rounded-lg"
        >
          <div className="flex flex-col gap-0.5">
            {names.map((name, i) => (
              <span key={i}>{name}</span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
