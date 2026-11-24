import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { APK_SETTING_KEYS, loadApkInfo, type ApkInfo } from "@/lib/androidApk";
import { useAuth } from "@/context/AuthContext";
import { APK_BUCKET, releasePath, validateApk } from "@/lib/androidRelease";

export function AndroidApkManager() {
  const { user } = useAuth();
  const [info, setInfo] = useState<ApkInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [build, setBuild] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadApkInfo().then((i) => { setInfo(i); setVersion(i.version); setBuild(i.build); }).catch(() => toast.error("Не вдалося завантажити дані застосунку")); }, []);

  const save = async () => {
    if (!user || !file || !info) return;
    if (!version.trim() || !/^\d+$/.test(build) || Number(build) <= Number(info.build)) { toast.error("Вкажіть версію та номер збірки, більший за поточний"); return; }
    setBusy(true);
    let uploadedPath: string | null = null;
    let published = false;
    try {
      await validateApk(file);
      const latest = await loadApkInfo();
      if (Number(build) <= Number(latest.build)) throw new Error("Цей номер збірки вже опубліковано. Оновіть дані.");
      const path = releasePath(user.id, crypto.randomUUID());
      const { error: uploadError } = await supabase.storage.from(APK_BUCKET).upload(path, file, { contentType: "application/vnd.android.package-archive", upsert: false, cacheControl: "60" });
      if (uploadError) throw uploadError;
      uploadedPath = path;
      const rows = [
        { id: APK_SETTING_KEYS.version, value: version.trim() },
        { id: APK_SETTING_KEYS.build, value: build },
        { id: APK_SETTING_KEYS.path, value: path },
        { id: APK_SETTING_KEYS.size, value: (file.size / 1024 / 1024).toFixed(1) },
      ];
      const { error } = await supabase.from("site_settings").upsert(rows);
      if (error) throw error;
      published = true;
      if (latest.path !== path) {
        const { error: cleanupError } = await supabase.storage.from(APK_BUCKET).remove([latest.path]);
        if (cleanupError) toast.warning("Нову версію опубліковано, але старий файл не вдалося прибрати");
      }
      toast.success("Застосунок оновлено");
      setFile(null);
      setInfo(await loadApkInfo());
    } catch (e: any) {
      if (uploadedPath && !published) await supabase.storage.from(APK_BUCKET).remove([uploadedPath]);
      console.error("[AndroidApkManager]", e);
      toast.error(`Не вдалося зберегти: ${e?.message ?? "помилка"}`);
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Мобільний застосунок Android</CardTitle>
        <CardDescription>
          Поточна версія: {info?.version ?? "…"} · збірка {info?.build ?? "…"} · {info?.sizeMb ?? "…"} МБ.
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
        <div className="space-y-2">
          <Label htmlFor="apk-build">Номер збірки Android (versionCode)</Label>
          <Input id="apk-build" type="number" min={Number(info?.build ?? 0) + 1} value={build} onChange={(e) => setBuild(e.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">Вкажіть versionName і versionCode з Android Studio. Для оновлення без видалення застосунку потрібні незмінний ідентифікатор та той самий ключ підпису. Старий файл прибирається лише після успішної публікації нового.</p>
        <Button onClick={save} disabled={busy || !file || !info} className="min-h-[44px]">{busy ? "Завантаження…" : "Опублікувати нову версію"}</Button>
      </CardContent>
    </Card>
  );
}
