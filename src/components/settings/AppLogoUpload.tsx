import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Smartphone, Upload, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateAppIcons } from "@/lib/iconGenerator";

const SETTING_KEYS = {
  any192: "app-icon-192",
  any512: "app-icon-512",
  maskable192: "app-icon-192-maskable",
  maskable512: "app-icon-512-maskable",
  apple180: "app-icon-apple-180",
  source: "app-icon-source",
} as const;

export function AppLogoUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", SETTING_KEYS.any512)
        .maybeSingle();
      if (data?.value) setCurrentIcon(data.value);
    };
    load();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Будь ласка, виберіть зображення");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Розмір файлу не повинен перевищувати 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Будь ласка, виберіть зображення");
      return;
    }

    setIsUploading(true);
    try {
      toast.info("Генеруємо іконки різних розмірів...");
      const icons = await generateAppIcons(file);

      const timestamp = Date.now();
      const uploaded: Record<string, string> = {};

      for (const icon of icons) {
        const path = `app-icons/${timestamp}-${icon.fileName}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, icon.blob, {
            upsert: true,
            contentType: "image/png",
            cacheControl: "31536000",
          });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
        uploaded[icon.fileName] = urlData.publicUrl;
      }

      // Map to setting IDs
      const settingsToSave: Array<{ id: string; value: string }> = [
        { id: SETTING_KEYS.any192, value: uploaded["app-icon-192.png"] },
        { id: SETTING_KEYS.any512, value: uploaded["app-icon-512.png"] },
        { id: SETTING_KEYS.maskable192, value: uploaded["app-icon-192-maskable.png"] },
        { id: SETTING_KEYS.maskable512, value: uploaded["app-icon-512-maskable.png"] },
        { id: SETTING_KEYS.apple180, value: uploaded["app-icon-apple-180.png"] },
      ];

      for (const s of settingsToSave) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ id: s.id, value: s.value, updated_at: new Date().toISOString() });
        if (error) throw error;
      }

      setCurrentIcon(uploaded["app-icon-512.png"]);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast.success("Іконку застосунка оновлено! Користувачі побачать зміни після оновлення.");

      // Notify other components
      window.dispatchEvent(new CustomEvent("app-icon-updated"));
    } catch (err: any) {
      console.error("Помилка завантаження іконки:", err);
      toast.error(`Не вдалося оновити іконку: ${err.message ?? "невідома помилка"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Іконка застосунка (PWA)
        </CardTitle>
        <CardDescription>
          Завантажте зображення (рекомендовано квадратне 1024×1024 PNG). Система автоматично згенерує всі
          розміри (192, 512, Apple Touch Icon) та додасть безпечні відступи для maskable-іконок.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center gap-4">
            {currentIcon ? (
              <>
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={currentIcon}
                    alt="Поточна іконка"
                    className="h-24 w-24 rounded-2xl object-cover border"
                  />
                  <span className="text-xs text-muted-foreground">Поточна</span>
                </div>
                {previewUrl && (
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={previewUrl}
                      alt="Нова іконка"
                      className="h-24 w-24 rounded-2xl object-cover border-2 border-primary"
                    />
                    <span className="text-xs text-primary">Нова</span>
                  </div>
                )}
              </>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Нова" className="h-24 w-24 rounded-2xl object-cover border" />
            ) : (
              <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-muted-foreground border border-dashed">
                <Smartphone className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>

        <Label>Виберіть зображення</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Вибрати зображення (до 10MB)
        </Button>

        {previewUrl && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
              <X className="mr-2 h-4 w-4" /> Скасувати
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Генеруємо…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Зберегти іконку
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}