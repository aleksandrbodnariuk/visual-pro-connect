import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { APK_SETTING_KEYS, loadApkInfo, type ApkInfo } from "@/lib/androidApk";

export function AndroidApkManager() {
  const [info, setInfo] = useState<ApkInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadApkInfo().then((i) => { setInfo(i); setVersion(i.version); }); }, []);

  const save = async () => {
    if (!file && !version.trim()) return;
    if (file && !file.name.toLowerCase().endsWith(".apk")) { toast.error("Оберіть файл .apk"); return; }
    if (file && file.size > 50 * 1024 * 1024) { toast.error("Файл більший за 50 МБ"); return; }
    setBusy(true);
    try {
      const rows: { id: string; value: string }[] = [{ id: APK_SETTING_KEYS.version, value: version.trim() || "1.0" }];
      if (file) {
        const path = `android/${Date.now()}-spilnota-bc.apk`;
        const { error } = await supabase.storage.from("logos").upload(path, file, {
          contentType: "application/vnd.android.package-archive", upsert: false,
        });
        if (error) throw error;
        rows.push({ id: APK_SETTING_KEYS.url, value: supabase.storage.from("logos").getPublicUrl(path).data.publicUrl });
        rows.push({ id: APK_SETTING_KEYS.size, value: (file.size / 1024 / 1024).toFixed(1) });
      }
      const { error } = await supabase.from("site_settings").upsert(rows);
      if (error) throw error;
      toast.success("Застосунок оновлено");
      setFile(null);
      setInfo(await loadApkInfo());
    } catch (e: any) {
      console.error("[AndroidApkManager]", e);
      toast.error(`Не вдалося зберегти: ${e?.message ?? "помилка"}`);
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Мобільний застосунок Android</CardTitle>
        <CardDescription>
          Поточна версія: {info?.version ?? "…"} · {info?.sizeMb ?? "…"} МБ. Новий файл одразу стане доступним у «Налаштуваннях» користувачів.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apk-file">Файл .apk</Label>
          <Input id="apk-file" type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apk-version">Версія</Label>
          <Input id="apk-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.1" />
        </div>
        <Button onClick={save} disabled={busy} className="min-h-[44px]">{busy ? "Завантаження…" : "Зберегти"}</Button>
      </CardContent>
    </Card>
  );
}
