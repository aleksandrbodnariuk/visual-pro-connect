
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, CheckSquare, MessageCircle, XSquare } from "lucide-react";
import { toast } from "sonner";

export function StockExchangeTab() {
  const [stockPrice, setStockPrice] = useState(() => {
    return localStorage.getItem("stockPrice") || "1000";
  });
  
  const [shareholders, setShareholders] = useState<any[]>(() => {
    const storedData = localStorage.getItem("users");
    if (!storedData) return [];
    
    const users = JSON.parse(storedData);
    return users.filter((user: any) => 
      user.isShareHolder || user.role === "shareholder"
    );
  });
  
  const [stockExchangeItems, setStockExchangeItems] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem("stockExchange") || "[]");
  });
  
  const [sharesTransactions, setSharesTransactions] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem("sharesTransactions") || "[]");
  });
  
  const [selectedShareholderId, setSelectedShareholderId] = useState("");
  const [selectedSharesCount, setSelectedSharesCount] = useState("1");
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");

  const updateStockPrice = () => {
    if (!stockPrice || isNaN(parseFloat(stockPrice)) || parseFloat(stockPrice) <= 0) {
      toast.error("Введіть коректну ціну акції");
      return;
    }
    
    localStorage.setItem("stockPrice", stockPrice);
    toast.success(`Ціну акції оновлено: ${stockPrice} грн`);
  };

  const handleSellShares = () => {
    if (!selectedShareholderId) {
      toast.error("Виберіть акціонера");
      return;
    }

    if (!selectedSharesCount || isNaN(parseInt(selectedSharesCount)) || parseInt(selectedSharesCount) <= 0) {
      toast.error("Введіть коректну кількість акцій");
      return;
    }

    const seller = shareholders.find(sh => sh.id === selectedShareholderId);
    if (!seller) {
      toast.error("Акціонера не знайдено");
      return;
    }

    if (parseInt(selectedSharesCount) > (seller.shares || 0)) {
      toast.error(`У акціонера лише ${seller.shares || 0} акцій`);
      return;
    }

    const newStockExchangeItem = {
      id: Date.now().toString(),
      sellerId: seller.id,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      sharesCount: parseInt(selectedSharesCount),
      pricePerShare: parseFloat(stockPrice),
      initialPrice: parseFloat(stockPrice),
      status: "Активна",
      date: new Date().toISOString(),
      isAuction: false
    };

    const updatedStockExchangeItems = [...stockExchangeItems, newStockExchangeItem];
    setStockExchangeItems(updatedStockExchangeItems);
    localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchangeItems));

    setSelectedShareholderId("");
    setSelectedSharesCount("1");

    toast.success("Акції виставлено на продаж");
  };

  const openTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setOpenTransactionDialog(true);
  };

  const approveTransaction = (transactionId: string) => {
    const transaction = sharesTransactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const seller = storedUsers.find((user: any) => user.id === transaction.sellerId);
    const buyer = storedUsers.find((user: any) => user.id === transaction.buyerId);

    if (!seller || !buyer) {
      toast.error("Користувача не знайдено");
      return;
    }

    // Update seller shares
    const updatedSeller = { 
      ...seller, 
      shares: (seller.shares || 0) - transaction.sharesCount 
    };

    // Update buyer shares
    const updatedBuyer = { 
      ...buyer, 
      shares: (buyer.shares || 0) + transaction.sharesCount,
      isShareHolder: true,
      role: buyer.role === "admin" || buyer.role === "admin-founder" ? buyer.role : "shareholder"
    };

    // Update users
    const updatedUsers = storedUsers.map((user: any) => {
      if (user.id === seller.id) return updatedSeller;
      if (user.id === buyer.id) return updatedBuyer;
      return user;
    });

    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setShareholders(updatedUsers.filter((user: any) => 
      user.isShareHolder || user.role === "shareholder"
    ));

    // Update transaction status
    const updatedTransactions = sharesTransactions.map(t => {
      if (t.id === transactionId) {
        return { ...t, status: "Завершено", adminApproved: true };
      }
      return t;
    });
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));

    // Remove item from stock exchange
    const updatedStockExchangeItems = stockExchangeItems.filter(
      item => item.id !== transaction.listingId
    );
    setStockExchangeItems(updatedStockExchangeItems);
    localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchangeItems));

    toast.success("Транзакцію успішно завершено");
    setOpenTransactionDialog(false);
  };

  const rejectTransaction = (transactionId: string) => {
    const transaction = sharesTransactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Update transaction status
    const updatedTransactions = sharesTransactions.map(t => {
      if (t.id === transactionId) {
        return { ...t, status: "Відхилено" };
      }
      return t;
    });
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));

    // Return item to active in stock exchange
    const updatedStockExchangeItems = stockExchangeItems.map(item => {
      if (item.id === transaction.listingId) {
        return { ...item, status: "Активна" };
      }
      return item;
    });
    setStockExchangeItems(updatedStockExchangeItems);
    localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchangeItems));

    toast.success("Транзакцію відхилено");
    setOpenTransactionDialog(false);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedTransaction) return;
    
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const senderName = `${currentUser.firstName || ""} ${currentUser.lastName || ""} (Адміністратор)`;
    
    const message = {
      id: Date.now().toString(),
      sender: senderName,
      senderId: currentUser.id || "admin",
      text: newMessage,
      date: new Date().toISOString()
    };
    
    const updatedTransaction = {
      ...selectedTransaction,
      messages: selectedTransaction.messages ? [...selectedTransaction.messages, message] : [message]
    };
    
    const updatedTransactions = sharesTransactions.map(t => 
      t.id === selectedTransaction.id ? updatedTransaction : t
    );
    
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));
    
    setSelectedTransaction(updatedTransaction);
    setNewMessage("");
    
    toast.success("Повідомлення відправлено");
  };

  // Filter active transactions for display
  const pendingTransactions = sharesTransactions.filter(t => 
    t.status === "Очікує підтвердження" || t.status === "В процесі"
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ціна акцій</CardTitle>
          <CardDescription>Встановіть поточну ціну акцій</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="stock-price">Ціна акції (грн)</Label>
              <Input 
                id="stock-price" 
                type="number" 
                placeholder="1000" 
                value={stockPrice}
                onChange={(e) => setStockPrice(e.target.value)}
              />
            </div>
            <Button onClick={updateStockPrice}>Оновити ціну</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Виставити акції на продаж</CardTitle>
          <CardDescription>Створіть нову пропозицію з продажу акцій</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shareholder">Акціонер</Label>
                <Select 
                  value={selectedShareholderId} 
                  onValueChange={setSelectedShareholderId}
                >
                  <SelectTrigger id="shareholder">
                    <SelectValue placeholder="Виберіть акціонера" />
                  </SelectTrigger>
                  <SelectContent>
                    {shareholders.map((sh) => (
                      <SelectItem key={sh.id} value={sh.id}>
                        {sh.firstName} {sh.lastName} ({sh.shares || 0} акцій)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shares-count">Кількість акцій</Label>
                <Input 
                  id="shares-count" 
                  type="number" 
                  placeholder="1" 
                  min="1" 
                  value={selectedSharesCount}
                  onChange={(e) => setSelectedSharesCount(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSellShares}>Створити пропозицію</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Активні угоди</CardTitle>
          <CardDescription>Транзакції, які очікують на обробку</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Дата</th>
                  <th className="text-left p-2">Продавець</th>
                  <th className="text-left p-2">Покупець</th>
                  <th className="text-left p-2">Кількість</th>
                  <th className="text-right p-2">Ціна (грн)</th>
                  <th className="text-left p-2">Статус</th>
                  <th className="text-left p-2">Дії</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransactions.length > 0 ? (
                  pendingTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{transaction.id.substring(0, 8)}...</td>
                      <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="p-2">{transaction.sellerName}</td>
                      <td className="p-2">{transaction.buyerName}</td>
                      <td className="p-2">{transaction.sharesCount}</td>
                      <td className="p-2 text-right">{transaction.totalAmount?.toFixed(2)}</td>
                      <td className="p-2">
                        <Badge 
                          variant={transaction.status === "Очікує підтвердження" ? "outline" : "secondary"}
                        >
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openTransaction(transaction)}>
                            <MessageCircle className="h-4 w-4 mr-1" /> Деталі
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-2 text-center text-muted-foreground">
                      Немає активних угод
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
        <DialogContent className="max-w-2xl">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle>Деталі транзакції</DialogTitle>
                <DialogDescription>
                  ID: {selectedTransaction.id}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Продавець</h3>
                    <p>{selectedTransaction.sellerName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Покупець</h3>
                    <p>{selectedTransaction.buyerName}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Кількість акцій</h3>
                    <p>{selectedTransaction.sharesCount}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Ціна за акцію</h3>
                    <p>{selectedTransaction.pricePerShare?.toFixed(2)} грн</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Загальна сума</h3>
                    <p>{selectedTransaction.totalAmount?.toFixed(2)} грн</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Повідомлення</h3>
                  <div className="bg-muted p-4 rounded-md h-40 overflow-y-auto mb-4">
                    {selectedTransaction.messages && selectedTransaction.messages.length > 0 ? (
                      selectedTransaction.messages.map((msg: any) => (
                        <div key={msg.id} className="mb-3">
                          <p className="text-xs font-medium">{msg.sender} • {new Date(msg.date).toLocaleString()}</p>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">Немає повідомлень</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Textarea 
                        placeholder="Напишіть повідомлення..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                    </div>
                    <Button onClick={sendMessage}>Відправити</Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button variant="destructive" onClick={() => rejectTransaction(selectedTransaction.id)}>
                    <XSquare className="mr-2 h-4 w-4" /> Відхилити
                  </Button>
                  <Button onClick={() => approveTransaction(selectedTransaction.id)}>
                    <CheckSquare className="mr-2 h-4 w-4" /> Затвердити
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
