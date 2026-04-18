import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ImageDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MigrationDetail {
  id: string;
  status: 'processed' | 'skipped' | 'error';
  reason?: string;
  oldSize?: number;
  newSize?: number;
  newUrl?: string;
  previewUrl?: string;
  title?: string;
}

interface MigrationResult {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  remaining?: number;
  details: MigrationDetail[];
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PortfolioImageMigration() {
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [limit, setLimit] = useState(3);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const runMigration = async () => {
    if (!dryRun && !confirm(`Запустити міграцію для ${limit} зображень портфоліо? Це необоротна операція.`)) return;

    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-portfolio-images', {
        body: { dryRun, limit },
      });
      if (error) throw error;
      const r = data as MigrationResult;

      // Enrich details with thumbnails + titles for display
      const ids = r.details.map((d) => d.id);
      if (ids.length) {
        const { data: rows } = await supabase
          .from('portfolio')
          .select('id, media_url, title')
          .in('id', ids);
        const map = new Map((rows || []).map((row) => [row.id, row]));
        r.details = r.details.map((d) => {
          const row = map.get(d.id);
          return row
            ? { ...d, previewUrl: row.media_url, title: row.title }
            : d;
        });
      }

      setResult(r);
      toast.success(`Готово: оброблено ${r.processed}, пропущено ${r.skipped}, помилок ${r.errors}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Невідома помилка';
      toast.error(`Помилка: ${msg}`);
    } finally {
      setRunning(false);
    }
  };

  const totalSaved = result?.details.reduce(
    (acc, d) => acc + ((d.oldSize || 0) - (d.newSize || 0)),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageDown className="h-5 w-5" />
          Міграція зображень портфоліо
        </CardTitle>
        <CardDescription>
          Стискає існуючі фото портфоліо у WebP (макс. 1024px, якість 0.78). Файли менше 500 КБ пропускаються. Старі файли видаляються після успішної заміни. Обробка послідовна — макс. 5 за раз для стабільності пам'яті.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 flex gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <div>
            <strong>Увага:</strong> операція замінює оригінальні файли. Рекомендуємо спочатку запустити в режимі «Тестовий прогін», щоб побачити, що буде оброблено.
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="limit">Кількість записів за прогін</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={5}
              value={limit}
              onChange={(e) => setLimit(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant={dryRun ? 'default' : 'outline'}
              onClick={() => setDryRun(!dryRun)}
              disabled={running}
              className="flex-1"
            >
              {dryRun ? '✓ Тестовий прогін' : 'Тестовий прогін'}
            </Button>
          </div>
        </div>

        <Button onClick={runMigration} disabled={running} className="w-full gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
          {running ? 'Обробка...' : dryRun ? 'Запустити тестовий прогін' : 'Запустити міграцію'}
        </Button>

        {result && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Всього</div>
                <div className="text-2xl font-bold">{result.total}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Оброблено</div>
                <div className="text-2xl font-bold text-success">{result.processed}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Пропущено</div>
                <div className="text-2xl font-bold text-muted-foreground">{result.skipped}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Помилок</div>
                <div className="text-2xl font-bold text-destructive">{result.errors}</div>
              </div>
            </div>

            {!!totalSaved && totalSaved > 0 && (
              <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-sm">
                <strong>Економія місця:</strong> {formatBytes(totalSaved)}
              </div>
            )}

            {typeof result.remaining === 'number' && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <strong>Залишилось необроблених:</strong> {result.remaining}
                  {result.remaining === 0 && ' 🎉 Усі фото оптимізовано!'}
                </div>
                {result.remaining > 0 && (
                  <Button size="sm" onClick={runMigration} disabled={running} className="gap-2">
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
                    Обробити наступні {Math.min(limit, result.remaining)}
                  </Button>
                )}
              </div>
            )}

            <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
              {result.details.map((d) => (
                <div key={d.id} className="p-2 flex items-center gap-3 text-xs">
                  {d.previewUrl ? (
                    <img
                      src={d.previewUrl}
                      alt={d.title || d.id}
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 rounded object-cover bg-muted shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{d.title || '—'}</div>
                    <code className="text-muted-foreground text-[10px]">{d.id.slice(0, 8)}</code>
                  </div>
                  <Badge
                    variant={
                      d.status === 'processed' ? 'default' : d.status === 'error' ? 'destructive' : 'secondary'
                    }
                    className="shrink-0"
                  >
                    {d.status}
                  </Badge>
                  <span className="text-muted-foreground truncate text-right shrink-0 max-w-[160px]">
                    {d.status === 'processed'
                      ? `${formatBytes(d.oldSize)} → ${formatBytes(d.newSize)}`
                      : d.reason || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
