import { useEffect, useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getInstallPrompt, clearInstallPrompt, subscribeInstallPrompt, isStandalone,
} from "@/lib/installPrompt";

export function InstallAppButton() {
  const [, force] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => subscribeInstallPrompt(() => force((n) => n + 1)), []);

  if (isStandalone()) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" /> Застосунок уже відкрито як встановлений.
      </p>
    );
  }

  const handleInstall = async () => {
    // Скидаємо застарілі позначки, щоб пропозиція встановлення знову працювала
    localStorage.removeItem("pwa-installed");
    localStorage.removeItem("pwa-install-dismissed");
    const prompt = getInstallPrompt();
    if (!prompt) {
      setShowHelp(true);
      return;
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    clearInstallPrompt();
    if (outcome === "accepted") toast.success("Застосунок встановлено");
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleInstall} className="min-h-[44px]">
        <Download className="h-4 w-4 mr-2" /> Встановити застосунок
      </Button>
      {showHelp && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
          <p className="font-medium text-foreground">Браузер не дозволив встановити автоматично. Зробіть це вручну:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><b>Avast / Chrome:</b> меню «⋮» → «Транслювати, зберегти й поділитися» → «Встановити сторінку як застосунок» (або «Створити ярлик» з позначкою «Відкривати у вікні»).</li>
            <li><b>Edge:</b> меню «…» → «Програми» → «Інсталювати цей сайт як програму».</li>
            <li><b>iPhone (Safari):</b> «Поділитися» → «На екран «Додому»».</li>
            <li><b>Android:</b> меню «⋮» → «Додати на головний екран».</li>
          </ul>
          <p className="text-xs text-muted-foreground">Якщо кнопка не спрацювала одразу — оновіть сторінку і натисніть ще раз.</p>
        </div>
      )}
    </div>
  );
}
