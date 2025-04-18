
import { Card, CardContent } from "@/components/ui/card";
import { Crown, DollarSign, Image, Users } from "lucide-react";

interface AdminStatsProps {
  users: number;
  shareholders: number;
  orders: number;
  stockPrice: string;
}

export function AdminStats({ users, shareholders, orders, stockPrice }: AdminStatsProps) {
  const stats = [
    { title: "Користувачі", value: users.toString(), icon: Users, color: "bg-blue-100 text-blue-700" },
    { title: "Акціонери", value: shareholders.toString(), icon: Crown, color: "bg-amber-100 text-amber-700" },
    { title: "Замовлення", value: orders.toString(), icon: DollarSign, color: "bg-green-100 text-green-700" },
    { title: "Ціна акції", value: `${stockPrice} грн`, icon: Image, color: "bg-purple-100 text-purple-700" },
  ];

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {stats.map((stat, i) => (
        <Card key={i}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-full ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
