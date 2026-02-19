
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, DollarSign, Eye, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminStatsProps {
  users: number;
  shareholders: number;
  orders: number;
  stockPrice: string;
}

export function AdminStats({ users, shareholders, orders, stockPrice }: AdminStatsProps) {
  const [visitStats, setVisitStats] = useState({ today: 0, month: 0, year: 0 });

  useEffect(() => {
    const loadVisitStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_visit_stats');
        if (error) {
          console.error('Error loading visit stats:', error);
          return;
        }
        if (data && data.length > 0) {
          setVisitStats({
            today: Number(data[0].visits_today) || 0,
            month: Number(data[0].visits_month) || 0,
            year: Number(data[0].visits_year) || 0,
          });
        }
      } catch (error) {
        console.error('Error loading visit stats:', error);
      }
    };
    loadVisitStats();
  }, []);

  const stats = [
    { title: "Користувачі", value: users.toString(), icon: Users, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { title: "Акціонери", value: shareholders.toString(), icon: Crown, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    { title: "Замовлення", value: orders.toString(), icon: DollarSign, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    { title: "Ціна акції", value: `${stockPrice} грн`, icon: DollarSign, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Main stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6 flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-lg sm:text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
              <div className={`p-2 sm:p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visit stats */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm sm:text-base">Відвідування сайту</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Сьогодні</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{visitStats.today}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Цей місяць</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{visitStats.month}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Цей рік</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{visitStats.year}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
