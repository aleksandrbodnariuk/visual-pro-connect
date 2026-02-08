
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Save, RefreshCw, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getCompressionSettings, 
  saveCompressionSettings, 
  DEFAULT_COMPRESSION_SETTINGS,
  type CompressionSettings 
} from '@/lib/imageCompression';

export function ImageCompressionSettings() {
  const [settings, setSettings] = useState<CompressionSettings>(getCompressionSettings());

  useEffect(() => {
    setSettings(getCompressionSettings());
  }, []);

  const handleSave = () => {
    saveCompressionSettings(settings);
    toast.success('Налаштування стискання збережено');
  };

  const handleReset = () => {
    setSettings(DEFAULT_COMPRESSION_SETTINGS);
    saveCompressionSettings(DEFAULT_COMPRESSION_SETTINGS);
    toast.success('Налаштування скинуто до стандартних');
  };

  const updateSetting = <K extends keyof CompressionSettings>(
    key: K,
    value: CompressionSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Стискання зображень
        </CardTitle>
        <CardDescription>
          Налаштування автоматичного стискання зображень при завантаженні. 
          Менша якість = менший розмір файлу = швидше завантаження.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Аватари</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Якість ({Math.round(settings.avatarQuality * 100)}%)</Label>
              <Slider
                value={[settings.avatarQuality]}
                min={0.3}
                max={1}
                step={0.05}
                onValueChange={([value]) => updateSetting('avatarQuality', value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Макс. ширина</Label>
                <Input
                  type="number"
                  value={settings.avatarMaxWidth}
                  onChange={(e) => updateSetting('avatarMaxWidth', parseInt(e.target.value) || 400)}
                />
              </div>
              <div className="space-y-2">
                <Label>Макс. висота</Label>
                <Input
                  type="number"
                  value={settings.avatarMaxHeight}
                  onChange={(e) => updateSetting('avatarMaxHeight', parseInt(e.target.value) || 400)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Banner Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Банери</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Якість ({Math.round(settings.bannerQuality * 100)}%)</Label>
              <Slider
                value={[settings.bannerQuality]}
                min={0.3}
                max={1}
                step={0.05}
                onValueChange={([value]) => updateSetting('bannerQuality', value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Макс. ширина</Label>
                <Input
                  type="number"
                  value={settings.bannerMaxWidth}
                  onChange={(e) => updateSetting('bannerMaxWidth', parseInt(e.target.value) || 1920)}
                />
              </div>
              <div className="space-y-2">
                <Label>Макс. висота</Label>
                <Input
                  type="number"
                  value={settings.bannerMaxHeight}
                  onChange={(e) => updateSetting('bannerMaxHeight', parseInt(e.target.value) || 600)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Post Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Фото в публікаціях</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Якість ({Math.round(settings.postQuality * 100)}%)</Label>
              <Slider
                value={[settings.postQuality]}
                min={0.3}
                max={1}
                step={0.05}
                onValueChange={([value]) => updateSetting('postQuality', value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Макс. ширина</Label>
                <Input
                  type="number"
                  value={settings.postMaxWidth}
                  onChange={(e) => updateSetting('postMaxWidth', parseInt(e.target.value) || 1200)}
                />
              </div>
              <div className="space-y-2">
                <Label>Макс. висота</Label>
                <Input
                  type="number"
                  value={settings.postMaxHeight}
                  onChange={(e) => updateSetting('postMaxHeight', parseInt(e.target.value) || 1200)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <p><strong>Рекомендовані налаштування:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Аватари: 80% якість, 400×400 пікселів</li>
            <li>Банери: 75% якість, 1920×600 пікселів</li>
            <li>Публікації: 80% якість, 1200×1200 пікселів</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Скинути
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Зберегти
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
