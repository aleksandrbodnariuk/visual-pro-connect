/**
 * ProfitPreviewBlock — read-only блок попереднього розрахунку розподілу прибутку
 * по одному замовленню.
 *
 * ВАЖЛИВО:
 * - Нічого НЕ записується в БД.
 * - Лише візуальний preview.
 * - Використовує реальні дані: shares, company_settings, users, representatives.
 * - Усі формули з централізованих модулів shareholderCalculations + representativeCalculations.
 */

import { useEffect, useState, useMemo } from 'react';
import { getVisibleTitle } from '@/lib/shareholderRules';
import { useViewerTitleLevel } from '@/hooks/useViewerTitleLevel';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Crown, AlertCircle, Loader2, UserCheck, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  type ShareholderInput,
} from '@/lib/shareholderCalculations';
import { useProfitDistConfig } from '@/hooks/useProfitDistConfig';
import {
  calcFullDistributionWithReps,
  calcRepresentativePool,
  type RepCommissionConfig,
  type RepresentativeChainNode,
  type FullDistributionWithReps,
  DEFAULT_REP_CONFIG,
} from '@/lib/representativeCalculations';
import { OrderParticipant, ORDER_TYPE_LABELS } from './types';

// ─── Типи ─────────────────────────────────────────────────────────────────────

interface SpecialistInfo {
  id: string;
  full_name: string;
}

interface ShareholderInfo {
  userId: string;
  fullName: string;
  shares: number;
}

interface Props {
  orderAmount: number | null;
  orderExpenses: number | null;
  participants: OrderParticipant[];
  participantInfos: Record<string, SpecialistInfo>;
  representativeId?: string | null;
}

// ─── Допоміжні компоненти ─────────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  );
}

function fmt(n: number) {
  return n.toFixed(2) + ' $';
}

const ROLE_LABELS: Record<string, string> = {
  representative: 'Представник',
  manager: 'Менеджер',
  director: 'Директор',
};

// ─── Основний компонент ───────────────────────────────────────────────────────

export function ProfitPreviewBlock({
  orderAmount,
  orderExpenses,
  participants,
  participantInfos,
  representativeId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [totalShares, setTotalShares] = useState<number>(0);
  const [shareholders, setShareholders] = useState<ShareholderInfo[]>([]);
  const [distribution, setDistribution] = useState<FullDistributionWithReps | null>(null);
  const [repConfig, setRepConfig] = useState<RepCommissionConfig>(DEFAULT_REP_CONFIG);
  const [repChain, setRepChain] = useState<RepresentativeChainNode[]>([]);
  const [repNames, setRepNames] = useState<Record<string, string>>({});
  const [unallocatedFunds, setUnallocatedFunds] = useState(0);
  const { viewerLevel, isAdmin: viewerIsAdmin } = useViewerTitleLevel();
  const { config: distConfig, loading: distConfigLoading } = useProfitDistConfig();

  // ── Завантаження реальних даних ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // 1. company_settings
      const { data: cs } = await supabase
        .from('company_settings')
        .select('total_shares, unallocated_funds')
        .limit(1)
        .single();

      const total = cs?.total_shares ?? 0;
      const fundBalance = cs?.unallocated_funds ?? 0;

      // 2. Акціонери з акціями > 0
      const { data: sharesData } = await supabase
        .from('shares')
        .select('user_id, quantity')
        .gt('quantity', 0);

      // 3. Імена акціонерів
      let shList: ShareholderInfo[] = [];
      if (sharesData && sharesData.length > 0) {
        const ids = sharesData.map((r) => r.user_id).filter(Boolean) as string[];
        const { data: profiles } = await supabase
          .rpc('get_safe_public_profiles_by_ids', { _ids: ids });

        const nameMap: Record<string, string> = {};
        if (profiles) {
          (profiles as any[]).forEach((p) => { nameMap[p.id] = p.full_name || 'Невідомий'; });
        }

        shList = sharesData
          .filter((r) => r.user_id && r.quantity > 0)
          .map((r) => ({
            userId: r.user_id as string,
            fullName: nameMap[r.user_id as string] || 'Невідомий',
            shares: r.quantity,
          }));
      }

      // 4. Rep commission config
      const { data: repSettings } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', ['rep-total-max-percent', 'rep-personal-percent', 'rep-manager-percent', 'rep-director-percent']);

      const cfg = { ...DEFAULT_REP_CONFIG };
      (repSettings || []).forEach((s: any) => {
        const v = parseFloat(s.value) / 100;
        if (s.id === 'rep-total-max-percent') cfg.totalMaxPercent = v;
        if (s.id === 'rep-personal-percent') cfg.personalPercent = v;
        if (s.id === 'rep-manager-percent') cfg.managerPercent = v;
        if (s.id === 'rep-director-percent') cfg.directorPercent = v;
      });

      // 5. Rep chain (representative → parent → grandparent)
      let chain: RepresentativeChainNode[] = [];
      const names: Record<string, string> = {};

      if (representativeId) {
        const { data: repData } = await supabase
          .from('representatives')
          .select('id, user_id, role, parent_id')
          .or(`id.eq.${representativeId}`);

        if (repData && repData.length > 0) {
          const rep = repData[0];
          chain.push({ representativeId: rep.id, userId: rep.user_id, role: rep.role });

          // Load parent
          if (rep.parent_id) {
            const { data: parentData } = await supabase
              .from('representatives')
              .select('id, user_id, role, parent_id')
              .eq('id', rep.parent_id)
              .single();

            if (parentData) {
              chain.push({ representativeId: parentData.id, userId: parentData.user_id, role: parentData.role });

              // Load grandparent
              if (parentData.parent_id) {
                const { data: gpData } = await supabase
                  .from('representatives')
                  .select('id, user_id, role')
                  .eq('id', parentData.parent_id)
                  .single();

                if (gpData) {
                  chain.push({ representativeId: gpData.id, userId: gpData.user_id, role: gpData.role });
                }
              }
            }
          }

          // Load names for chain
          const chainUserIds = chain.map(n => n.userId);
          if (chainUserIds.length > 0) {
            const { data: chainProfiles } = await supabase
              .rpc('get_safe_public_profiles_by_ids', { _ids: chainUserIds });
            if (chainProfiles) {
              (chainProfiles as any[]).forEach(p => { names[p.id] = p.full_name || 'Невідомий'; });
            }
          }
        }
      }

      if (!cancelled) {
        setTotalShares(total);
        setShareholders(shList);
        setRepConfig(cfg);
        setRepChain(chain);
        setRepNames(names);
        setUnallocatedFunds(fundBalance);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [representativeId]);

  // ── Розрахунок при зміні вхідних даних ─────────────────────────────────────
  useEffect(() => {
    if (orderAmount == null || orderExpenses == null || loading || distConfigLoading) {
      setDistribution(null);
      return;
    }

    const inputs: ShareholderInput[] = shareholders.map((s) => ({
      userId: s.userId,
      shares: s.shares,
    }));

    const dist = calcFullDistributionWithReps(
      orderAmount,
      orderExpenses,
      inputs,
      totalShares,
      repChain,
      unallocatedFunds,
      repConfig,
    );
    setDistribution(dist);
  }, [orderAmount, orderExpenses, shareholders, totalShares, loading, distConfig, distConfigLoading, repChain, repConfig, unallocatedFunds]);

  // ── Розрахунок частки фахівця ───────────────────────────────────────────────
  const specialistCount = participants.length;
  const getSpecialistShare = (dist: FullDistributionWithReps) =>
    specialistCount > 0 ? dist.specialistsPool / specialistCount : 0;

  // ── Рендер ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Попередній розрахунок розподілу прибутку</h4>
        <Badge variant="outline" className="text-xs ml-auto">Preview</Badge>
      </div>

      {/* ── Основні пули ──────────────────────────────────────────────────── */}
      {orderAmount == null ? (
        <EmptyState message="Сума замовлення ще не задана" />
      ) : orderExpenses == null ? (
        <EmptyState message="Витрати ще не задані" />
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Завантаження даних…
        </div>
      ) : !distribution || distribution.netProfit <= 0 ? (
        <EmptyState message="Чистий прибуток ≤ 0 — розподіл не виконується" />
      ) : (
        <div className="rounded-lg border p-3 space-y-2 text-sm bg-muted/20">
          {/* Покриття витрат з фонду */}
          {distribution.coveredFromFund > 0.005 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  Покрито з фонду витрат
                </span>
                <span className="text-green-600 dark:text-green-400">{fmt(distribution.coveredFromFund)}</span>
              </div>
              {distribution.remainingExpenses > 0.005 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground pl-4 text-xs">↳ залишок витрат (з прибутку)</span>
                  <span className="text-xs">{fmt(distribution.remainingExpenses)}</span>
                </div>
              )}
              <Separator />
            </>
          )}

          <Row label="Чистий прибуток" value={fmt(distribution.originalNetProfit)} bold />

          {/* Представники */}
          {distribution.representativePool.deductions.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Представники ({(distribution.representativePool.totalPercent * 100).toFixed(1)}%)</span>
                <span>{fmt(distribution.representativePool.totalAmount)}</span>
              </div>
              {distribution.representativePool.deductions.map((d) => (
                <div key={d.representativeId} className="flex justify-between text-xs pl-3">
                  <span className="text-muted-foreground">
                    {repNames[d.userId] || 'Невідомий'} ({ROLE_LABELS[d.role] || d.role}, {(d.percent * 100).toFixed(1)}%)
                  </span>
                  <span>{fmt(d.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Прибуток після представників</span>
                <span className="font-medium">{fmt(distribution.representativePool.netProfitAfterReps)}</span>
              </div>
            </>
          )}

          <Separator />
          <Row label={`${(distConfig.specialistsPercent * 100).toFixed(1)}% — фахівцям`} value={fmt(distribution.specialistsPool)} />
          <Row label={`${(distConfig.sharesPercent * 100).toFixed(1)}% — акціонерам (за акціями)`} value={fmt(distribution.sharesPool)} />
          <Row label={`${(distConfig.titleBonusPercent * 100).toFixed(1)}% — титульні бонуси`} value={fmt(distribution.titleBonusPool)} />
          {distribution.unclaimedTitleBonus > 0.005 && (
            <div className="flex justify-between text-sm text-amber-500">
              <span className="pl-3 text-xs">↳ не засвоєні → фонд витрат</span>
              <span className="text-xs">{fmt(distribution.unclaimedTitleBonus)}</span>
            </div>
          )}
          <Row label={`${(distConfig.adminFundPercent * 100).toFixed(1)}% — адміністративний фонд`} value={fmt(distribution.adminFund)} />

          {/* Баланс фонду після операції */}
          {(distribution.coveredFromFund > 0.005 || distribution.unclaimedTitleBonus > 0.005) && (
            <>
              <Separator />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  Баланс фонду після операції
                </span>
                <span className="font-medium">{fmt(distribution.unallocatedFundsAfter)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Представники замовлення ────────────────────────────────────────── */}
      {distribution && distribution.netProfit > 0 && distribution.representativePool.deductions.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 pt-1">
            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Представники
            </span>
          </div>
          <div className="rounded-lg border divide-y text-sm">
            {distribution.representativePool.deductions.map((d) => (
              <div key={d.representativeId} className="flex items-center justify-between px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-xs">{repNames[d.userId] || 'Невідомий'}</span>
                  <Badge variant="outline" className="text-xs w-fit">
                    {ROLE_LABELS[d.role] || d.role} — {(d.percent * 100).toFixed(1)}%
                  </Badge>
                </div>
                <span className="text-primary font-semibold text-sm">{fmt(d.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Фахівці замовлення ────────────────────────────────────────────── */}
      {distribution && distribution.netProfit > 0 && (
        <>
          <div className="flex items-center gap-1.5 pt-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Фахівці цього замовлення
            </span>
          </div>

          {participants.length === 0 ? (
            <EmptyState message="До замовлення ще не додано фахівців" />
          ) : (
            <div className="rounded-lg border divide-y text-sm">
              {participants.map((p) => {
                const info = participantInfos[p.specialist_id];
                const share = getSpecialistShare(distribution);
                return (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-xs">
                        {info?.full_name || 'Завантаження…'}
                      </span>
                      <Badge variant="outline" className="text-xs w-fit">
                        {ORDER_TYPE_LABELS[p.role as keyof typeof ORDER_TYPE_LABELS] || p.role}
                      </Badge>
                    </div>
                    <span className="text-primary font-semibold text-sm">{fmt(share)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Акціонери ─────────────────────────────────────────────────────── */}
      {distribution && distribution.netProfit > 0 && (
        <>
          <div className="flex items-center gap-1.5 pt-1">
            <Crown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Акціонери
            </span>
          </div>

          {totalShares <= 0 ? (
            <EmptyState message="Загальну кількість акцій ще не налаштовано" />
          ) : distribution.shareholders.length === 0 ? (
            <EmptyState message="У системі ще немає акціонерів" />
          ) : (
            <div className="rounded-lg border divide-y text-sm">
              {distribution.shareholders.map((sh) => {
                const shInfo = shareholders.find((s) => s.userId === sh.userId);
                return (
                  <div key={sh.userId} className="px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs">{shInfo?.fullName || 'Невідомий'}</span>
                        {sh.title && (
                          <Badge variant="secondary" className="text-xs">
                            {sh.title.title}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {sh.shares} акц. ({sh.percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                      <div>
                        <div className="text-foreground font-medium">{fmt(sh.baseIncome)}</div>
                        <div>базовий</div>
                      </div>
                      <div>
                        <div className="text-foreground font-medium">{fmt(sh.titleBonus)}</div>
                        <div>титульний бонус</div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary font-semibold">{fmt(sh.totalIncome)}</div>
                        <div>разом</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground italic">
        * Це попередній розрахунок. Дані не зберігаються і не є фактичним нарахуванням.
      </p>
    </div>
  );
}
