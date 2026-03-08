
import { useState, useEffect } from "react";
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
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";

export function StockExchangeTab() {
  const { sharePriceUsd, loading: settingsLoading, updateSharePrice } = useCompanySettings();
  const [stockPrice, setStockPrice] = useState<string>("");
  
  const [shareholders, setShareholders] = useState<any[]>([]);
  
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

  // Sync price from DB
  useEffect(() => {
    if (!settingsLoading) {
      setStockPrice(sharePriceUsd.toString());
    }
  }, [sharePriceUsd, settingsLoading]);

  // Fetch shareholders from Supabase
  useEffect(() => {
    const fetchShareholders = async () => {
      const { data: allUsers, error } = await supabase.rpc('get_users_for_admin');
      if (error) {
        console.error("Error fetching users for stock exchange:", error);
        return;
      }
      const sh = (allUsers || [])
        .filter((u: any) => u.is_shareholder)
        .map((u: any) => {
          const parts = u.full_name ? u.full_name.split(' ') : ['', ''];
          return {
            id: u.id,
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            shares: 0, // will be enriched below
          };
        });
      
      // Fetch shares for each
      for (const s of sh) {
        const { data } = await supabase
          .from('shares')
          .select('quantity')
          .eq('user_id', s.id)
          .limit(1);
        s.shares = data && data.length > 0 ? data[0].quantity : 10;
      }
      
      setShareholders(sh);
    };
    fetchShareholders();
  }, []);

  const updateStockPriceHandler = async () => {
    const price = parseFloat(stockPrice);
    if (!stockPrice || isNaN(price) || price <= 0) {
      toast.error("Введіть коректну ціну акції");
      return;
    }
    
    const success = await updateSharePrice(price);
    if (success) {
      toast.success(`Ціну акції оновлено: ${price} USD`);
    }
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

    const price = parseFloat(stockPrice) || sharePriceUsd;

    const newStockExchangeItem = {
      id: Date.now().toString(),
      sellerId: seller.id,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      sharesCount: parseInt(selectedSharesCount),
      pricePerShare: price,
      initialPrice: price,
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

    // NOTE: market/transactions logic still uses localStorage — will be migrated in a later phase
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const seller = storedUsers.find((user: any) => user.id === transaction.sellerId);
    const buyer = storedUsers.find((user: any) => user.id === transaction.buyerId);

    if (!seller || !buyer) {
      toast.error("Користувача не знайдено");
      return;
    }

    const updatedSeller = { ...seller, shares: (seller.shares || 0) - transaction.sharesCount };
    const updatedBuyer = { 
      ...buyer, 
      shares: (buyer.shares || 0) + transaction.sharesCount,
      isShareHolder: true,
      role: buyer.role === "admin" || buyer.role === "admin-founder" ? buyer.role : "shareholder"
    };

    const updatedUsers = storedUsers.map((user: any) => {
      if (user.id === seller.id) return updatedSeller;
      if (user.id === buyer.id) return updatedBuyer;
      return user;
    });

    localStorage.setItem("users", JSON.stringify(updatedUsers));

    const updatedTransactions = sharesTransactions.map(t => {
      if (t.id === transactionId) {
        return { ...t, status: "Завершено", adminApproved: true };
      }
      return t;
    });
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));

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

    const updatedTransactions = sharesTransactions.map(t => {
      if (t.id === transactionId) {
        return { ...t, status: "Відхилено" };
      }
      return t;
    });
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));

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
    
    const message = {
      id: Date.now().toString(),
      sender: "Адміністратор",
      senderId: "admin",
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

  const pendingTransactions = sharesTransactions.filter(t => 
    t.status === "Очікує підтвердження" || t.status === "В процесі"
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ціна акцій</CardTitle>
          <CardDescription>Встановіть поточну ціну акцій (USD)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="stock-price">Ціна акції (USD)</Label>
              <Input 
                id="stock-price" 
                type="number" 
                placeholder="10" 
                value={stockPrice}
                onChange={(e) => setStockPrice(e.target.value)}
                disabled={settingsLoading}
              />
            </div>
            <Button onClick={updateStockPriceHandler} disabled={settingsLoading}>Оновити ціну</Button>
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
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Дата</th>
                  <th className="text-left p-2">Продавець</th>
                  <th className="text-left p-2">Покупець</th>
                  <th className="text-left p-2">Кількість</th>
                  <th className="text-right p-2">Ціна (USD)</th>
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

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {pendingTransactions.length > 0 ? (
              pendingTransactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="text-xs text-muted-foreground">ID: {transaction.id.substring(0, 8)}...</p>
                      <Badge 
                        variant={transaction.status === "Очікує підтвердження" ? "outline" : "secondary"}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm">{new Date(transaction.date).toLocaleDateString()}</p>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Продавець:</span>
                      <span>{transaction.sellerName}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Покупець:</span>
                      <span>{transaction.buyerName}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Кількість:</span>
                      <span>{transaction.sharesCount} акцій</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">{transaction.totalAmount?.toFixed(2)} USD</span>
                      <Button variant="outline" size="sm" onClick={() => openTransaction(transaction)}>
                        <MessageCircle className="h-4 w-4 mr-1" /> Деталі
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Немає активних угод
              </div>
            )}
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
                    <p>{selectedTransaction.pricePerShare?.toFixed(2)} USD</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Загальна сума</h3>
                    <p>{selectedTransaction.totalAmount?.toFixed(2)} USD</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Повідомлення</h3>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                    {selectedTransaction.messages?.length > 0 ? (
                      selectedTransaction.messages.map((msg: any) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-medium">{msg.sender}: </span>
                          <span>{msg.text}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(msg.date).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Немає повідомлень</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      placeholder="Введіть повідомлення..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button onClick={sendMessage}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="destructive" 
                  onClick={() => rejectTransaction(selectedTransaction.id)}
                >
                  <XSquare className="h-4 w-4 mr-1" /> Відхилити
                </Button>
                <Button 
                  onClick={() => approveTransaction(selectedTransaction.id)}
                >
                  <CheckSquare className="h-4 w-4 mr-1" /> Схвалити
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
