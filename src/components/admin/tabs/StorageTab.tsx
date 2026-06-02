import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, HardDrive, Database, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type BucketStat = { bucket: string; files: number; bytes: number };
type TableStat = { table: string; bytes: number; rows: number };
type Stats = {
  storage: BucketStat[];
  storage_total_bytes: number;
  storage_total_files: number;
  db: { db_bytes: number; tables: TableStat[] };
};
type Orphan = { path: string; bytes: number };

function fmt(bytes: number): string {
  if (!bytes) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function StorageTab() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [orphansLoading, setOrphansLoading] = useState(false);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("storage-admin", {
        body: { action: "stats" },
      });
      if (error) throw error;
      setStats(data);
    } catch (e: any) {
      toast.error("Не вдалося завантажити статистику: " + (e?.message || e));
    } finally { setLoading(false); }
  };

  const loadOrphans = async (bucket: string) => {
    setActiveBucket(bucket);
    setOrphans([]);
    setSelected(new Set());
    setOrphansLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("storage-admin", {
        body: { action: "orphans", bucket },
      });
      if (error) throw error;
      setOrphans(data?.orphans || []);
      if (data?.note) toast.info(data.note);
    } catch (e: any) {
      toast.error("Не вдалося отримати неприв'язані файли: " + (e?.message || e));
    } finally { setOrphansLoading(false); }
  };

  const deleteSelected = async () => {
    if (!activeBucket || selected.size === 0) return;
    if (!confirm(`Видалити ${selected.size} файл(ів) з бакету ${activeBucket}? Цю дію не можна скасувати.`)) return;
    setDeleting(true);
    try {
      const paths = Array.from(selected);
      const { data, error } = await supabase.functions.invoke("storage-admin", {
        body: { action: "delete-orphans", bucket: activeBucket, paths },
      });
      if (error) throw error;
      toast.success(`Видалено ${data?.removed ?? 0} файл(ів)` + (data?.skipped ? `, пропущено ${data.skipped}` : ""));
      setSelected(new Set());
      await loadOrphans(activeBucket);
      loadStats();
    } catch (e: any) {
      toast.error("Помилка видалення: " + (e?.message || e));
    } finally { setDeleting(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const totalSize = (stats?.storage_total_bytes || 0) + (stats?.db?.db_bytes || 0);

  return (
    <div className="space-y-4">
      {/* Загальна статистика */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" /> Огляд сховища
              </CardTitle>
              <CardDescription>Розмір файлів у бакетах та розмір бази даних</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={loadStats} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1">Оновити</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !stats ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !stats ? (
            <p className="text-muted-foreground text-sm">Немає даних</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Файли (Storage)</div>
                  <div className="text-2xl font-bold">{fmt(stats.storage_total_bytes)}</div>
                  <div className="text-xs text-muted-foreground">{stats.storage_total_files} об'єктів</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">База даних</div>
                  <div className="text-2xl font-bold">{fmt(stats.db?.db_bytes || 0)}</div>
                  <div className="text-xs text-muted-foreground">{stats.db?.tables?.length || 0} таблиць</div>
                </div>
                <div className="rounded-lg border bg-primary/5 p-3">
                  <div className="text-xs text-muted-foreground">Загалом</div>
                  <div className="text-2xl font-bold">{fmt(totalSize)}</div>
                  <div className="text-xs text-muted-foreground">Storage + БД</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <HardDrive className="h-4 w-4" /> Бакети файлів
                  </h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-2">Бакет</th>
                          <th className="text-right p-2">Файлів</th>
                          <th className="text-right p-2">Розмір</th>
                          <th className="text-right p-2">Дії</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.storage.map((b) => (
                          <tr key={b.bucket} className="border-t">
                            <td className="p-2 font-medium">{b.bucket}</td>
                            <td className="p-2 text-right">{b.files}</td>
                            <td className="p-2 text-right">{fmt(b.bytes)}</td>
                            <td className="p-2 text-right">
                              <Button size="sm" variant="outline" onClick={() => loadOrphans(b.bucket)}>
                                <Search className="h-3 w-3 mr-1" /> Сміття
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" /> Таблиці БД (топ 15)
                  </h3>
                  <div className="rounded-md border overflow-hidden max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Таблиця</th>
                          <th className="text-right p-2">Рядків</th>
                          <th className="text-right p-2">Розмір</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stats.db?.tables || []).slice(0, 15).map((t) => (
                          <tr key={t.table} className="border-t">
                            <td className="p-2 font-mono text-xs">{t.table}</td>
                            <td className="p-2 text-right">{t.rows}</td>
                            <td className="p-2 text-right">{fmt(t.bytes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Неприв'язані файли */}
      {activeBucket && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Неприв'язані файли — <Badge variant="outline">{activeBucket}</Badge>
                </CardTitle>
                <CardDescription>
                  Файли в бакеті, на які немає посилань у базі даних. Безпечно видаляти.
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => loadOrphans(activeBucket)} disabled={orphansLoading}>
                  {orphansLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                {orphans.length > 0 && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setSelected(new Set(orphans.map((o) => o.path)))}>
                      Виділити всі ({orphans.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selected.size === 0 || deleting}
                      onClick={deleteSelected}
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Видалити вибрані ({selected.size})
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {orphansLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : orphans.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                ✅ У бакеті <b>{activeBucket}</b> немає неприв'язаних файлів
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Знайдено <b>{orphans.length}</b> неприв'язаних файлів загальним розміром{" "}
                  <b>{fmt(orphans.reduce((s, o) => s + o.bytes, 0))}</b>.
                </p>
                <div className="rounded-md border overflow-hidden max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="w-10 p-2"></th>
                        <th className="text-left p-2">Шлях</th>
                        <th className="text-right p-2 w-24">Розмір</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orphans.map((o) => (
                        <tr key={o.path} className="border-t hover:bg-muted/30">
                          <td className="p-2">
                            <Checkbox
                              checked={selected.has(o.path)}
                              onCheckedChange={(v) => {
                                const next = new Set(selected);
                                if (v) next.add(o.path); else next.delete(o.path);
                                setSelected(next);
                              }}
                            />
                          </td>
                          <td className="p-2 font-mono text-xs break-all">{o.path}</td>
                          <td className="p-2 text-right">{fmt(o.bytes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}