
import { Card, CardContent } from "@/components/ui/card";
import { Crown, DollarSign, Users } from "lucide-react";

interface AdminStatsProps {
  users: number;
  shareholders: number;
  stockPrice: string;
}

export function AdminStats({ users, shareholders, stockPrice }: AdminStatsProps) {
  const stats = [
    { title: "Користувачі", value: users.toString(), icon: Users, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { title: "Акціонери", value: shareholders.toString(), icon: Crown, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    { title: "Ціна акції", value: `${stockPrice} грн`, icon: DollarSign, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  ];

  return (
    <div className="mb-8">
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
