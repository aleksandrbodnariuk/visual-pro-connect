import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Layers, Percent, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  TITLE_THRESHOLDS,
  TITLE_BONUS_LEVELS,
  TITLE_BONUS_PERCENT_PER_LEVEL,
} from "@/lib/shareholderRules";
import { DEFAULT_REP_CONFIG, type RepCommissionConfig } from "@/lib/representativeCalculations";
import type { ShareholderDistConfig } from "@/lib/shareholderCalculations";

interface Props {
  config: ShareholderDistConfig;
  /** Кількість акціонерів на кожному рівні титулу (level -> count) */
  levelCounts?: Record<number, number>;
}

const fmtPct = (v: number, digits = 2) =>
  `${(v * 100).toFixed(digits).replace(/\.00$/, "")}%`;

export function ShareholderTiersTables({ config, levelCounts = {} }: Props) {
  const [repConfig, setRepConfig] = useState<RepCommissionConfig>(DEFAULT_REP_CONFIG);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", [
          "rep-total-max-percent",
          "rep-personal-percent",
          "rep-manager-percent",
          "rep-director-percent",
        ]);
      const cfg = { ...DEFAULT_REP_CONFIG };
      (data || []).forEach((s: any) => {
        const v = parseFloat(s.value) / 100;
        if (isNaN(v)) return;
        if (s.id === "rep-total-max-percent") cfg.totalMaxPercent = v;
        if (s.id === "rep-personal-percent") cfg.personalPercent = v;
        if (s.id === "rep-manager-percent") cfg.managerPercent = v;
        if (s.id === "rep-director-percent") cfg.directorPercent = v;
      });
      setRepConfig(cfg);
    };
    load();
  }, []);

  const levels = useMemo(
    () => [...TITLE_THRESHOLDS].sort((a, b) => b.level - a.level),
    [],
  );

  const bonusPerLevel = useMemo(() => {
    const count = TITLE_BONUS_LEVELS.length || 1;
    return config.titleBonusPercent
      ? config.titleBonusPercent / count
      : TITLE_BONUS_PERCENT_PER_LEVEL;
  }, [config.titleBonusPercent]);

  const pools = [
    { label: "Фахівці", value: config.specialistsPercent, hint: "Виконавці замовлення" },
    { label: "Акціонери (усі акції)", value: config.sharesPercent, hint: "Пропорційно кількості акцій" },
    { label: "Титульні бонуси", value: config.titleBonusPercent, hint: `${TITLE_BONUS_LEVELS.length} рівнів × ${fmtPct(bonusPerLevel)}` },
    { label: "Адмін-фонд", value: config.adminFundPercent, hint: "Реклама, домен, сайт, ремонт" },
  ];

  const repRows = [
    { role: "Представник (особисте замовлення)", value: repConfig.personalPercent },
    { role: "Менеджер (1-ша лінія)", value: repConfig.managerPercent },
    { role: "Директор (2-га лінія)", value: repConfig.directorPercent },
  ];

  return (
    <div className="space-y-6">
      {/* Рівні акціонерів */}
      <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Преміум рівні акціонерів
          </CardTitle>
          <CardDescription>
            Титули, пороги за відсотком акцій і належні титульні бонуси
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Рівень</th>
                  <th className="px-4 py-3 font-medium">Титул</th>
                  <th className="px-4 py-3 font-medium">Поріг акцій</th>
                  <th className="px-4 py-3 font-medium">Титульних бонусів</th>
                  <th className="px-4 py-3 font-medium">Сумарний бонус</th>
                  <th className="px-4 py-3 font-medium">Дозвіл адміна</th>
                  <th className="px-4 py-3 text-right font-medium">Акціонерів</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((t) => {
                  const bonusCount = t.level;
                  return (
                    <tr key={t.level} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-500">
                          {t.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{t.title}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">≥ {t.minPercent}%</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {bonusCount > 0 ? `${bonusCount} з ${TITLE_BONUS_LEVELS.length}` : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {bonusCount > 0 ? fmtPct(bonusPerLevel * bonusCount) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {t.level >= 2 ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-500">Потрібен</Badge>
                        ) : (
                          <Badge variant="secondary">Автоматично</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{levelCounts[t.level] ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Комісійні відсотки виплат */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Комісійні відсотки виплат
            </CardTitle>
            <CardDescription>Розподіл чистого прибутку між пулами</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {pools.map((p) => (
                  <tr key={p.label} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.hint}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="tabular-nums text-base font-semibold">{fmtPct(p.value)}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/40">
                  <td className="px-4 py-3 font-medium">Разом</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {fmtPct(pools.reduce((s, p) => s + p.value, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Комісії представників
            </CardTitle>
            <CardDescription>Утримуються з чистого прибутку до розподілу</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {repRows.map((r) => (
                  <tr key={r.role} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{r.role}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-base font-semibold">
                      {fmtPct(r.value)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/40">
                  <td className="px-4 py-3 font-medium">Максимум сумарно</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {fmtPct(repConfig.totalMaxPercent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Титульні бонуси по рівнях */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Титульні бонуси по рівнях
          </CardTitle>
          <CardDescription>
            Кожен рівень — {fmtPct(bonusPerLevel)} чистого прибутку, розподілені між акціонерами цього рівня і вище
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Бонус</th>
                  <th className="px-4 py-3 font-medium">Учасники</th>
                  <th className="px-4 py-3 text-right font-medium">Відсоток</th>
                </tr>
              </thead>
              <tbody>
                {TITLE_BONUS_LEVELS.map((b) => (
                  <tr key={b.bonusLevel} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 tabular-nums">Рівень {b.bonusLevel}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtPct(bonusPerLevel)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40">
                  <td className="px-4 py-3 font-medium" colSpan={2}>Разом титульні бонуси</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {fmtPct(config.titleBonusPercent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
