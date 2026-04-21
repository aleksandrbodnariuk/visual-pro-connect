import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Cake, Percent, Loader2, Calendar } from "lucide-react";
import { useVipBenefits } from "@/hooks/vip/useVipBenefits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Props {
  userId: string;
}

export function VipBenefitsCard({ userId }: Props) {
  const benefits = useVipBenefits(userId);
  const [claimingMonthly, setClaimingMonthly] = useState(false);
  const [claimingBirthday, setClaimingBirthday] = useState(false);
  const navigate = useNavigate();

  if (benefits.loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!benefits.hasVip) return null;

  const claimMonthly = async () => {
    setClaimingMonthly(true);
    const { data, error } = await supabase.rpc("claim_vip_monthly_bonus" as any, {
      _user_id: userId,
    });
    setClaimingMonthly(false);
    if (error) {
      toast.error("Помилка: " + error.message);
      return;
    }
    const res = data as any;
    if (!res?.ok) {
      const map: Record<string, string> = {
        already_claimed: "Бонус вже отримано в цьому місяці",
        no_active_vip: "Немає активного VIP",
        no_bonus_for_tier: "Для вашого тарифу бонус не передбачено",
      };
      toast.error(map[res?.error] || "Не вдалося отримати бонус");
      return;
    }
    toast.success(`🎁 Нараховано ${res.bonus_uah}₴ на сертифікат`);
    benefits.reload();
  };

  const claimBirthday = async () => {
    setClaimingBirthday(true);
    const { data, error } = await supabase.rpc("claim_vip_birthday_gift" as any, {
      _user_id: userId,
    });
    setClaimingBirthday(false);
    if (error) {
      toast.error("Помилка: " + error.message);
      return;
    }
    const res = data as any;
    if (!res?.ok) {
      const map: Record<string, string> = {
        no_birth_date: "Вкажіть дату народження в профілі",
        not_birth_month: "Подарунок доступний лише в місяць народження",
        already_claimed_this_year: "Подарунок цього року вже отримано",
        no_active_vip: "Немає активного VIP",
      };
      toast.error(map[res?.error] || "Не вдалося отримати подарунок");
      return;
    }
    toast.success(`🎂 Нараховано ${res.bonus_uah}₴ на сертифікат`);
    benefits.reload();
  };

  return (
    <Card className="p-6 space-y-5 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-amber-500" />
        <h3 className="font-bold text-lg">Економічні переваги VIP</h3>
      </div>

      {/* Discount */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border">
        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <Percent className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">
            Постійна знижка {benefits.discountPercent}% на послуги фахівців
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Сумується зі знижковим сертифікатом — обидві переваги застосовуються разом.
          </p>
        </div>
      </div>

      {/* Monthly bonus */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border">
        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <Gift className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Щомісячний бонус: {benefits.monthlyBonusUah}₴</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {benefits.lastMonthlyBonusAt
              ? `Востаннє: ${format(new Date(benefits.lastMonthlyBonusAt), "d MMM yyyy", { locale: uk })}`
              : "Ще не отримували"}
            {benefits.monthlyNextAvailableAt && !benefits.monthlyAvailable && (
              <> • Наступний {formatDistanceToNow(new Date(benefits.monthlyNextAvailableAt), { addSuffix: true, locale: uk })}</>
            )}
          </p>
        </div>
        <Button
          size="sm"
          disabled={!benefits.monthlyAvailable || claimingMonthly}
          onClick={claimMonthly}
        >
          {claimingMonthly && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Отримати
        </Button>
      </div>

      {/* Birthday gift */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border">
        <div className="w-10 h-10 rounded-full bg-pink-500/15 flex items-center justify-center shrink-0">
          <Cake className="h-5 w-5 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2 flex-wrap">
            Подарунок на день народження: {benefits.birthdayBonusUah}₴
            {benefits.isBirthMonth && (
              <Badge className="bg-pink-500/15 text-pink-600 border-pink-500/30">
                <Calendar className="h-3 w-3 mr-1" /> Цей місяць!
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {!benefits.hasBirthDate
              ? "Вкажіть дату народження у профілі, щоб отримувати подарунок"
              : benefits.lastBirthdayGiftYear
              ? `Востаннє у ${benefits.lastBirthdayGiftYear} році`
              : "Доступний раз на рік у місяць народження"}
          </p>
        </div>
        {!benefits.hasBirthDate ? (
          <Button size="sm" variant="outline" onClick={() => navigate("/profile")}>
            Профіль
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!benefits.birthdayAvailable || claimingBirthday}
            onClick={claimBirthday}
          >
            {claimingBirthday && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Отримати
          </Button>
        )}
      </div>
    </Card>
  );
}