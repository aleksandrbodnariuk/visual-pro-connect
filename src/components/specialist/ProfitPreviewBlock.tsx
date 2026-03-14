/**
 * ProfitPreviewBlock — read-only блок попереднього розрахунку розподілу прибутку
 * по одному замовленню.
 *
 * ВАЖЛИВО:
 * - Нічого НЕ записується в БД.
 * - Лише візуальний preview.
 * - Використовує реальні дані: shares, company_settings, users.
 * - Усі формули з централізованого модуля shareholderCalculations.
 */

import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Crown, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  calcFullProfitDistribution,
  type ProfitDistribution,
  type ShareholderProfitResult,
  type ShareholderInput,
} from '@/lib/shareholderCalculations';
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
  /** Сума замовлення (null = не задана) */
  orderAmount: number | null;
  /** Витрати замовлення (null = не задані) */
  orderExpenses: number | null;
  /** Учасники замовлення (фахівці) */
  participants: OrderParticipant[];
  /** Імена фахівців (вже завантажені в батьківському компоненті) */
  participantInfos: Record<string, SpecialistInfo>;
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

// ─── Основний компонент ───────────────────────────────────────────────────────

export function ProfitPreviewBlock({
  orderAmount,
  orderExpenses,
  participants,
  participantInfos,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [totalShares, setTotalShares] = useState<number>(0);
  const [shareholders, setShareholders] = useState<ShareholderInfo[]>([]);
  const [distribution, setDistribution] = useState<ProfitDistribution | null>(null);

  // ── Завантаження реальних даних ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // 1. company_settings — загальна кількість акцій
      const { data: cs } = await supabase
        .from('company_settings')
        .select('total_shares')
        .limit(1)
        .single();

      const total = cs?.total_shares ?? 0;

      // 2. Всі акціонери з кількістю акцій > 0
      const { data: sharesData } = await supabase
        .from('shares')
        .select('user_id, quantity')
        .gt('quantity', 0);

      if (!sharesData || sharesData.length === 0 || cancelled) {
        if (!cancelled) {
          setTotalShares(total);
          setShareholders([]);
          setLoading(false);
        }
        return;
      }

      // 3. Імена акціонерів
      const ids = sharesData.map((r) => r.user_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .rpc('get_safe_public_profiles_by_ids', { _ids: ids });

      const nameMap: Record<string, string> = {};
      if (profiles) {
        (profiles as any[]).forEach((p) => { nameMap[p.id] = p.full_name || 'Невідомий'; });
      }

      const shList: ShareholderInfo[] = sharesData
        .filter((r) => r.user_id && r.quantity > 0)
        .map((r) => ({
          userId: r.user_id as string,
          fullName: nameMap[r.user_id as string] || 'Невідомий',
          shares: r.quantity,
        }));

      if (!cancelled) {
        setTotalShares(total);
        setShareholders(shList);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Розрахунок при зміні вхідних даних ─────────────────────────────────────
  useEffect(() => {
    if (
      orderAmount == null ||
      orderExpenses == null ||
      loading
    ) {
      setDistribution(null);
      return;
    }

    const inputs: ShareholderInput[] = shareholders.map((s) => ({
      userId: s.userId,
      shares: s.shares,
    }));

    const dist = calcFullProfitDistribution(orderAmount, orderExpenses, inputs, totalShares);
    setDistribution(dist);
  }, [orderAmount, orderExpenses, shareholders, totalShares, loading]);

  // ── Перевірки готовності ─────────────────────────────────────────────────────

  // Розрахунок частки фахівця
  const specialistCount = participants.length;
  const getSpecialistShare = (dist: ProfitDistribution) =>
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
          <Row label="Чистий прибуток" value={fmt(distribution.netProfit)} bold />
          <Separator />
          <Row label="50% — фахівцям" value={fmt(distribution.specialistsPool)} />
          <Row label="20% — акціонерам (за акціями)" value={fmt(distribution.sharesPool)} />
          <Row label="17.5% — титульні бонуси" value={fmt(distribution.titleBonusPool)} />
          {distribution.unclaimedTitleBonus > 0.005 && (
            <div className="flex justify-between text-sm text-amber-500">
              <span className="pl-3 text-xs">↳ не засвоєні</span>
              <span className="text-xs">{fmt(distribution.unclaimedTitleBonus)}</span>
            </div>
          )}
          <Row label="12.5% — адміністративний фонд" value={fmt(distribution.adminFund)} />
        </div>
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
