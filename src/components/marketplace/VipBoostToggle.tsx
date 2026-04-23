import { Crown, Sparkles, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useUserVip } from '@/hooks/vip/useUserVip';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
}

/**
 * VIP-бустинг доступний лише користувачам з активним VIP-членством.
 * Неактивованим користувачам показується промо-блок із посиланням на /vip.
 */
export function VipBoostToggle({ value, onChange }: Props) {
  const { user } = useAuth();
  const { vip, loading } = useUserVip(user?.id);
  const hasActiveVip = Boolean(vip);

  const handleCheckedChange = (checked: boolean) => {
    if (!hasActiveVip) return;
    onChange(checked);
  };

  if (loading) {
    return <div className="h-20 rounded-md bg-muted animate-pulse" />;
  }

  if (!vip) {
    return (
      <Card className="p-3 border-dashed bg-gradient-to-br from-amber-500/5 to-amber-500/10 dark:from-amber-500/10 dark:to-amber-500/15">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">VIP-бустинг оголошення</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Підніміть оголошення у топ стрічки та вирізнітеся золотим бейджем. Доступно власникам VIP.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
              <Link to="/vip">Дізнатися про VIP</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm flex items-center gap-1.5">
              VIP-бустинг
              <Crown className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Топ-позиція у стрічці + золотий бейдж VIP
            </p>
          </div>
        </div>
        <Switch checked={value} onCheckedChange={handleCheckedChange} disabled={!hasActiveVip} />
      </div>
    </Card>
  );
}
