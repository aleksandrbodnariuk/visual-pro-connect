
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Archive } from "lucide-react";
import { toast } from "sonner";
import { calcNetProfit } from "@/lib/shareholderCalculations";

export function OrdersTab() {
  const [orders, setOrders] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem("orders") || "[]");
  });
  const [newOrderAmount, setNewOrderAmount] = useState("");
  const [newOrderExpenses, setNewOrderExpenses] = useState("");
  const [newOrderDescription, setNewOrderDescription] = useState("");
  const [newFinancialNotes, setNewFinancialNotes] = useState("");

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
    const expenses = parseFloat(newOrderExpenses) || 0;
    const orderId = Date.now().toString();
    
    const newOrder = {
      id: orderId,
      amount,
      expenses,
      financial_notes: newFinancialNotes.trim() || null,
      description: newOrderDescription,
      date: new Date().toISOString(),
      status: "Завершено"
    };
    
    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    
    // УВАГА: стара мок-логіка розподілу прибутку (45%) ізольована нижче.
    // Вона НЕ підключена до нових фінансових полів і НЕ є реальним розрахунком.
    // Буде замінена на справжній алгоритм на наступному етапі.
    /* --- LEGACY MOCK (не видаляти до наступного етапу) ---
    const profitToDistribute = amount * 0.45;
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    // ... (стара логіка localStorage)
    --- END LEGACY MOCK --- */
    
    setNewOrderAmount("");
    setNewOrderExpenses("");
    setNewOrderDescription("");
    setNewFinancialNotes("");
    
    const net = calcNetProfit(amount, expenses);
    toast.success(`Замовлення додано. Чистий прибуток: ${net.toFixed(2)} $`);
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
              <div>
                <Label htmlFor="expenses">Витрати (грн)</Label>
                <Input 
                  id="expenses" 
                  type="number" 
                  placeholder="0" 
                  value={newOrderExpenses}
                  onChange={(e) => setNewOrderExpenses(e.target.value)}
                />
              </div>
            </div>
            {/* Попередній чистий прибуток — read-only */}
            {newOrderAmount && (
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Чистий прибуток:</span>
                <span className="font-semibold text-primary">
                  {calcNetProfit(
                    parseFloat(newOrderAmount) || 0,
                    parseFloat(newOrderExpenses) || 0
                  ).toFixed(2)} ₴
                </span>
              </div>
            )}
            <div>
              <Label htmlFor="description">Опис замовлення</Label>
              <Textarea 
                id="description" 
                placeholder="Опишіть деталі замовлення" 
                value={newOrderDescription}
                onChange={(e) => setNewOrderDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="financialNotes">Фінансова примітка (необов'язково)</Label>
              <Input
                id="financialNotes"
                placeholder="Коментар до фінансів..."
                value={newFinancialNotes}
                onChange={(e) => setNewFinancialNotes(e.target.value)}
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
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Дата</th>
                  <th className="text-left p-2">Опис</th>
                  <th className="text-right p-2">Сума (грн)</th>
                  <th className="text-right p-2">Витрати (грн)</th>
                  <th className="text-right p-2 text-primary">Чистий прибуток</th>
                  <th className="text-left p-2">Статус</th>
                  <th className="text-left p-2">Дії</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => {
                    const net = calcNetProfit(order.amount ?? 0, order.expenses ?? 0);
                    return (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="p-2">{order.description}</td>
                      <td className="p-2 text-right">{(order.amount ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-right text-muted-foreground">{(order.expenses ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-right font-semibold text-primary">{net.toFixed(2)}</td>
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-2 text-center text-muted-foreground">
                      Немає активних замовлень
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - shown only on mobile */}
          <div className="md:hidden space-y-4">
            {orders.length > 0 ? (
              orders.map((order) => {
                const net = calcNetProfit(order.amount ?? 0, order.expenses ?? 0);
                return (
                <Card key={order.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="text-sm">{new Date(order.date).toLocaleDateString()}</p>
                      <span className="text-sm font-medium">{order.status}</span>
                    </div>
                    
                    <p className="text-sm">{order.description}</p>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pt-1">
                      <div>
                        <p className="text-xs text-muted-foreground">Сума</p>
                        <p className="font-medium">{(order.amount ?? 0).toFixed(2)} ₴</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Витрати</p>
                        <p className="text-muted-foreground">{(order.expenses ?? 0).toFixed(2)} ₴</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Чистий</p>
                        <p className="font-semibold text-primary">{net.toFixed(2)} ₴</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => archiveOrder(order.id)}>
                        <Archive className="h-4 w-4 mr-1" /> Архів
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1" onClick={() => deleteOrder(order.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Видалити
                      </Button>
                    </div>
                  </div>
                </Card>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Немає активних замовлень
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
