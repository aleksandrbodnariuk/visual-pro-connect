import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_APK, loadApkInfo, isAndroid, type ApkInfo } from "@/lib/androidApk";

export function AndroidApkDownload() {
  const [info, setInfo] = useState<ApkInfo>(DEFAULT_APK);
  useEffect(() => { loadApkInfo().then(setInfo).catch(() => {}); }, []);
  const android = isAndroid();

  return (
    <div className="space-y-3">
      <Button asChild variant={android ? "default" : "secondary"} className="min-h-[44px]">
        <a href={info.url} download="spilnota-bc.apk">
          <Smartphone className="h-4 w-4 mr-2" /> Завантажити для Android
        </a>
      </Button>
      <p className="text-xs text-muted-foreground">Версія {info.version} · {info.sizeMb} МБ</p>
      <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
        <li>Натисніть кнопку і дочекайтеся завантаження файлу.</li>
        <li>Відкрийте завантажений файл (у шторці сповіщень або «Файли» → «Завантаження»).</li>
        <li>Якщо телефон попросить — дозвольте «Встановлення з невідомих джерел» для браузера.</li>
        <li>Натисніть «Встановити». Якщо Google Play Protect попередить — оберіть «Усе одно встановити».</li>
      </ol>
    </div>
  );
}
