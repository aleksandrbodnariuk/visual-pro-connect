import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EarningsBlockProps {
  representativeId: string;
}

interface EarningsSummary {
  today: number;
  month: number;
  total: number;
}

export function EarningsBlock({ representativeId }: EarningsBlockProps) {
  const [earnings, setEarnings] = useState<EarningsSummary>({ today: 0, month: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('representative_earnings')
          .select('amount, created_at')
          .eq('representative_id', representativeId);

        if (error) throw error;

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const monthStr = now.toISOString().slice(0, 7);

        const summary: EarningsSummary = { today: 0, month: 0, total: 0 };

        for (const row of data || []) {
          const amt = Number(row.amount) || 0;
          summary.total += amt;
          if (row.created_at?.startsWith(todayStr)) summary.today += amt;
          if (row.created_at?.startsWith(monthStr)) summary.month += amt;
        }

        setEarnings(summary);
      } catch (err) {
        console.error('Error loading earnings:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [representativeId]);

  const items = [
    { label: 'Сьогодні', value: earnings.today, icon: Calendar, color: 'text-emerald-500' },
    { label: 'За місяць', value: earnings.month, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Загальний', value: earnings.total, icon: DollarSign, color: 'text-amber-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          Мій дохід
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center space-y-1">
              <item.icon className={`h-5 w-5 mx-auto ${item.color}`} />
              {loading ? (
                <Skeleton className="h-7 w-20 mx-auto" />
              ) : (
                <p className="text-xl font-bold tabular-nums">
                  ${item.value.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
