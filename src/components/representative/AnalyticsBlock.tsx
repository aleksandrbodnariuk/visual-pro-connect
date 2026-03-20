import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, DollarSign, Users, TrendingUp, Award } from 'lucide-react';

type Period = 'month' | 'year' | 'all';

interface FinancialStats {
  total_orders: number;
  total_profit: number;
  total_representatives_paid: number;
  total_shareholders_paid: number;
  total_unallocated: number;
}

interface TopRep {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  earnings: number;
  orders_count: number;
}

export function AnalyticsBlock() {
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [topReps, setTopReps] = useState<TopRep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [statsRes, topRes] = await Promise.all([
          (supabase.rpc as any)('get_financial_stats', { _period: period }),
          (supabase.rpc as any)('get_top_representatives', { _period: period }),
        ]);

        if (statsRes.data && statsRes.data.length > 0) {
          const s = statsRes.data[0];
          setStats({
            total_orders: Number(s.total_orders) || 0,
            total_profit: Number(s.total_profit) || 0,
            total_representatives_paid: Number(s.total_representatives_paid) || 0,
            total_shareholders_paid: Number(s.total_shareholders_paid) || 0,
            total_unallocated: Number(s.total_unallocated) || 0,
          });
        } else {
          setStats({ total_orders: 0, total_profit: 0, total_representatives_paid: 0, total_shareholders_paid: 0, total_unallocated: 0 });
        }

        if (topRes.data) {
          setTopReps(topRes.data.map((r: any) => ({
            user_id: r.user_id,
            full_name: r.full_name,
            avatar_url: r.avatar_url,
            earnings: Number(r.earnings) || 0,
            orders_count: Number(r.orders_count) || 0,
          })));
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period]);

  const periods: { value: Period; label: string }[] = [
    { value: 'month', label: 'Місяць' },
    { value: 'year', label: 'Рік' },
    { value: 'all', label: 'Весь час' },
  ];

  const statCards = stats ? [
    { label: 'Загальний прибуток', value: stats.total_profit, icon: DollarSign, color: 'text-emerald-600' },
    { label: 'Виплати представникам', value: stats.total_representatives_paid, icon: Users, color: 'text-blue-600' },
    { label: 'Виплати акціонерам', value: stats.total_shareholders_paid, icon: TrendingUp, color: 'text-amber-600' },
    { label: 'Нерозподілено', value: stats.total_unallocated, icon: BarChart3, color: 'text-muted-foreground' },
  ] : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Аналітика
          </CardTitle>
          <div className="flex gap-1">
            {periods.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p.value)}
                className="text-xs h-7 px-2.5"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg border bg-card">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))
          ) : (
            statCards.map((card) => (
              <div key={card.label} className="p-3 rounded-lg border bg-card space-y-1">
                <div className="flex items-center gap-1.5">
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                  <span className="text-[11px] text-muted-foreground leading-tight">{card.label}</span>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  ${card.value.toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Top representatives */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-500" />
            Топ представники
          </h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topReps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Немає даних за цей період
            </p>
          ) : (
            <div className="space-y-2">
              {topReps.map((rep, idx) => (
                <div
                  key={rep.user_id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <span className="text-sm font-bold text-muted-foreground w-5 text-center tabular-nums">
                    {idx + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={rep.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(rep.full_name || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {rep.full_name || 'Без імені'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rep.orders_count} замовлень
                    </p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums font-mono text-xs">
                    ${rep.earnings.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
