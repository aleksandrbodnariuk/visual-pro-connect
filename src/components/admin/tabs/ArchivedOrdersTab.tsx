
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

// Card component for mobile view is already imported above

export function ArchivedOrdersTab() {
  const [archivedOrders, setArchivedOrders] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem("archivedOrders") || "[]");
  });

  const deleteArchivedOrder = (orderId: string) => {
    const updatedArchivedOrders = archivedOrders.filter(order => order.id !== orderId);
    setArchivedOrders(updatedArchivedOrders);
    localStorage.setItem("archivedOrders", JSON.stringify(updatedArchivedOrders));
    toast.success("Архівне замовлення видалено");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Архів замовлень</CardTitle>
        <CardDescription>Перегляд архівних замовлень</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop Table - hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Дата створення</th>
                <th className="text-left p-2">Дата архівації</th>
                <th className="text-left p-2">Опис</th>
                <th className="text-right p-2">Сума (грн)</th>
                <th className="text-left p-2">Дії</th>
              </tr>
            </thead>
            <tbody>
              {archivedOrders.length > 0 ? (
                archivedOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{order.id}</td>
                    <td className="p-2">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="p-2">{order.archivedDate ? new Date(order.archivedDate).toLocaleDateString() : "Невідомо"}</td>
                    <td className="p-2">{order.description}</td>
                    <td className="p-2 text-right">{order.amount.toFixed(2)}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <ArrowUpRight className="h-4 w-4 mr-1" /> Деталі
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteArchivedOrder(order.id)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Видалити
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-2 text-center text-muted-foreground">
                    Немає архівних замовлень
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards - shown only on mobile */}
        <div className="md:hidden space-y-4">
          {archivedOrders.length > 0 ? (
            archivedOrders.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">ID: {order.id}</p>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Створено:</span>
                    <span>{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Архівовано:</span>
                    <span>{order.archivedDate ? new Date(order.archivedDate).toLocaleDateString() : "Невідомо"}</span>
                  </div>
                  
                  <p className="text-sm">{order.description}</p>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold">{order.amount.toFixed(2)} грн</span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <ArrowUpRight className="h-4 w-4 mr-1" /> Деталі
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => deleteArchivedOrder(order.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Видалити
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Немає архівних замовлень
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
