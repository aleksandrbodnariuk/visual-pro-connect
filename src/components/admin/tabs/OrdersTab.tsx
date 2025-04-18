
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Archive } from "lucide-react";
import { toast } from "sonner";

export function OrdersTab() {
  const [orders, setOrders] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem("orders") || "[]");
  });
  const [newOrderAmount, setNewOrderAmount] = useState("");
  const [newOrderDescription, setNewOrderDescription] = useState("");

  const addNewOrder = () => {
    if (!newOrderAmount || isNaN(parseFloat(newOrderAmount)) || parseFloat(newOrderAmount) <= 0) {
      toast.error("Введіть коректну суму замовлення");
      return;
    }
    
    if (!newOrderDescription.trim()) {
      toast.error("Введіть опис замовлення");
      return;
    }
    
    const amount = parseFloat(newOrderAmount);
    const orderId = Date.now().toString();
    
    const newOrder = {
      id: orderId,
      amount,
      description: newOrderDescription,
      date: new Date().toISOString(),
      status: "Завершено"
    };
    
    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    
    // Distribute profit to shareholders
    const profitToDistribute = amount * 0.45;
    
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const shareholders = storedUsers.filter((user: any) => 
      user.isShareHolder || user.role === "shareholder"
    );
    
    if (shareholders.length > 0) {
      // Calculate total shares
      const totalShares = shareholders.reduce(
        (sum: number, sh: any) => sum + (sh.shares || 0), 0
      );
      
      // Update shareholder profits
      const updatedUsers = storedUsers.map((user: any) => {
        if (user.isShareHolder || user.role === "shareholder") {
          const sharePortion = ((user.shares || 0) / totalShares) * profitToDistribute;
          return {
            ...user,
            profit: (user.profit || 0) + sharePortion
          };
        }
        return user;
      });
      
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    }
    
    setNewOrderAmount("");
    setNewOrderDescription("");
    
    toast.success("Замовлення додано і прибуток розподілено між акціонерами");
  };
  
  const deleteOrder = (orderId: string) => {
    const updatedOrders = orders.filter(order => order.id !== orderId);
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    toast.success("Замовлення видалено");
  };
  
  const archiveOrder = (orderId: string) => {
    const orderToArchive = orders.find(order => order.id === orderId);
    if (!orderToArchive) return;
    
    const updatedOrders = orders.filter(order => order.id !== orderId);
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    
    const archivedOrders = JSON.parse(localStorage.getItem("archivedOrders") || "[]");
    const updatedArchivedOrders = [...archivedOrders, {...orderToArchive, archivedDate: new Date().toISOString()}];
    localStorage.setItem("archivedOrders", JSON.stringify(updatedArchivedOrders));
    
    toast.success("Замовлення архівовано");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Додати нове замовлення</CardTitle>
          <CardDescription>Створіть нове замовлення і розподіліть прибуток між акціонерами</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Сума замовлення (грн)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="5000" 
                  value={newOrderAmount}
                  onChange={(e) => setNewOrderAmount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Опис замовлення</Label>
              <Textarea 
                id="description" 
                placeholder="Опишіть деталі замовлення" 
                value={newOrderDescription}
                onChange={(e) => setNewOrderDescription(e.target.value)}
              />
            </div>
            <Button onClick={addNewOrder}>Додати замовлення</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Список замовлень</CardTitle>
          <CardDescription>Перегляд та управління замовленнями</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Дата</th>
                  <th className="text-left p-2">Опис</th>
                  <th className="text-right p-2">Сума (грн)</th>
                  <th className="text-left p-2">Статус</th>
                  <th className="text-left p-2">Дії</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{order.id}</td>
                      <td className="p-2">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="p-2">{order.description}</td>
                      <td className="p-2 text-right">{order.amount.toFixed(2)}</td>
                      <td className="p-2">{order.status}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => archiveOrder(order.id)}>
                            <Archive className="h-4 w-4 mr-1" /> Архів
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteOrder(order.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Видалити
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-2 text-center text-muted-foreground">
                      Немає активних замовлень
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
