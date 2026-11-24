import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_APK, loadApkInfo, isAndroid, downloadAndroidApk, type ApkInfo } from "@/lib/androidApk";
import { toast } from "sonner";

export function AndroidApkDownload() {
  const [info, setInfo] = useState<ApkInfo>(DEFAULT_APK);
  useEffect(() => { loadApkInfo().then(setInfo).catch(() => {}); }, []);
  const android = isAndroid();

  return (
    <div className="space-y-3">
      <Button onClick={() => downloadAndroidApk().catch(() => toast.error("Не вдалося відкрити завантаження"))} variant={android ? "default" : "secondary"} className="min-h-[44px]">
          <Smartphone className="h-4 w-4 mr-2" /> Завантажити для Android
      </Button>
      <p className="text-xs text-muted-foreground">Версія {info.version} · {info.sizeMb} МБ</p>
      <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
        <li>Натисніть кнопку і дочекайтеся завантаження файлу.</li>
        <li>Відкрийте завантажений файл (у шторці сповіщень або «Файли» → «Завантаження»).</li>
        <li>Якщо телефон попросить — дозвольте «Встановлення з невідомих джерел» для браузера.</li>
        <li>Натисніть «Встановити» або «Оновити». Не видаляйте попередню версію.</li>
        <li>Якщо захист телефона повідомляє про небезпеку, не ігноруйте попередження: зверніться до адміністратора.</li>
      </ol>
    </div>
  );
}
