import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";

export function StudioTeamBanner() {
  const { settings } = useAssistantSettings();
  const url = settings?.studio_url?.trim();
  return (
    <div className="mx-auto mb-6 flex max-w-3xl flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center">
      <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
      <div className="flex-1">
        <div className="font-semibold">Єдина команда B&C studio</div>
        <p className="text-sm text-muted-foreground">
          Усі фахівці — команда B&C studio. Замовляючи послугу, ви замовляєте її у B&C studio з єдиною гарантією якості та підтримкою.
        </p>
      </div>
      {url && (
        <Button asChild variant="outline" className="min-h-[44px]">
          <a href={url} target="_blank" rel="noopener noreferrer">Сайт B&C studio <ExternalLink className="ml-2 h-4 w-4" /></a>
        </Button>
      )}
    </div>
  );
}

export function StudioTeamBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary" title="Фахівець команди B&C studio">
      <ShieldCheck className="h-3 w-3" /> Команда B&C studio
    </span>
  );
}
