
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  MessageSquare, 
  PieChart 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";

export default function StockMarket() {
  const [stockExchangeItems, setStockExchangeItems] = useState<any[]>([]);
  const [sharesTransactions, setSharesTransactions] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [stockPrice, setStockPrice] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [buyAmount, setBuyAmount] = useState("1");
  const [openBuyDialog, setOpenBuyDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sharesCount, setSharesCount] = useState("1");
  const [sharePrice, setSharePrice] = useState("");
  const [openSellDialog, setOpenSellDialog] = useState(false);
  
  const navigate = useNavigate();
  const { getCurrentUser, isAuthenticated, loading } = useSupabaseAuth();
  const currentUser = getCurrentUser();
  
  useEffect(() => {
    // Проверяем аутентификацию через Supabase
    if (loading) return;
    
    if (!isAuthenticated() || !currentUser) {
      toast.error("Доступ заборонено: Необхідно увійти в систему");
      navigate("/auth");
      return;
    }
    
    if (!currentUser.isShareHolder) {
      toast.error("Доступ заборонено: Необхідний статус акціонера");
      navigate("/");
      return;
    }
    
    const storedPrice = localStorage.getItem("stockPrice");
    setStockPrice(storedPrice ? parseFloat(storedPrice) : 1000);
    
    const storedExchange = localStorage.getItem("stockExchange");
    if (storedExchange) {
      setStockExchangeItems(JSON.parse(storedExchange));
    }
    
    const storedTransactions = localStorage.getItem("sharesTransactions");
    if (storedTransactions) {
      setSharesTransactions(JSON.parse(storedTransactions));
    }
    
    const storedUsers = localStorage.getItem("users");
    if (storedUsers) {
      const users = JSON.parse(storedUsers);
      const shareholdersData = users.filter((u: any) => u.isShareHolder);
      setShareholders(shareholdersData);
    }
    
    setSharePrice(storedPrice || "1000");
  }, [navigate, loading, isAuthenticated, currentUser]);
  
  const handleBuyOffer = (offer: any) => {
    if (offer.sellerId === currentUser.id) {
      toast.error("Ви не можете купити власні акції");
      return;
    }
    
    setSelectedOffer(offer);
    setBuyAmount("1");
    setOpenBuyDialog(true);
  };
  
  const confirmBuy = () => {
    if (!selectedOffer) return;
    
    const amount = parseInt(buyAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedOffer.sharesCount) {
      toast.error(`Введіть коректну кількість акцій (1-${selectedOffer.sharesCount})`);
      return;
    }
    
    const totalPrice = amount * selectedOffer.pricePerShare;
    
    const newTransaction = {
      id: Date.now().toString(),
      listingId: selectedOffer.id,
      sellerId: selectedOffer.sellerId,
      sellerName: selectedOffer.sellerName,
      buyerId: currentUser.id,
      buyerName: `${currentUser.firstName} ${currentUser.lastName}`,
      sharesCount: amount,
      pricePerShare: selectedOffer.pricePerShare,
      totalAmount: totalPrice,
      status: "Очікує підтвердження",
      date: new Date().toISOString(),
      messages: [],
      sellerConfirmed: false,
      buyerConfirmed: true,
      adminApproved: false
    };
    
    const updatedTransactions = [...sharesTransactions, newTransaction];
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));
    
    const updatedStockExchangeItems = stockExchangeItems.map(item => {
      if (item.id === selectedOffer.id) {
        return { ...item, status: "В процесі продажу" };
      }
      return item;
    });
    
    setStockExchangeItems(updatedStockExchangeItems);
    localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchangeItems));
    
    setOpenBuyDialog(false);
    toast.success("Запит на купівлю акцій відправлено");
  };
  
  const openTransactionDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setOpenDetailsDialog(true);
  };
  
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedTransaction) return;
    
    const message = {
      id: Date.now().toString(),
      sender: `${currentUser.firstName} ${currentUser.lastName}`,
      senderId: currentUser.id,
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
    toast.success("Повідомлення надіслано");
  };
  
  const confirmTransaction = () => {
    if (!selectedTransaction) return;
    
    const updatedTransaction = {
      ...selectedTransaction,
      sellerConfirmed: selectedTransaction.sellerId === currentUser.id,
      buyerConfirmed: selectedTransaction.buyerId === currentUser.id,
      status: "Очікує схвалення адміністратора"
    };
    
    const updatedTransactions = sharesTransactions.map(t => 
      t.id === selectedTransaction.id ? updatedTransaction : t
    );
    
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));
    
    setSelectedTransaction(updatedTransaction);
    toast.success("Транзакцію підтверджено");
  };
  
  const cancelTransaction = () => {
    if (!selectedTransaction) return;
    
    const updatedTransactions = sharesTransactions.map(t => {
      if (t.id === selectedTransaction.id) {
        return { ...t, status: "Скасовано" };
      }
      return t;
    });
    
    setSharesTransactions(updatedTransactions);
    localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));
    
    const updatedStockExchangeItems = stockExchangeItems.map(item => {
      if (item.id === selectedTransaction.listingId) {
        return { ...item, status: "Активна" };
      }
      return item;
    });
    
    setStockExchangeItems(updatedStockExchangeItems);
    localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchangeItems));
    
    setOpenDetailsDialog(false);
    toast.success("Транзакцію скасовано");
  };
  
  const openSellSharesDialog = () => {
    setSharesCount("1");
    setSharePrice(stockPrice.toString());
    setOpenSellDialog(true);
  };
  
  const sellShares = () => {
    const amount = parseInt(sharesCount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Введіть коректну кількість акцій");
      return;
    }
    
    if (!currentUser.shares || amount > currentUser.shares) {
      toast.error(`У вас недостатньо акцій. Ваш баланс: ${currentUser.shares || 0}`);
      return;
    }
    
    const price = parseFloat(sharePrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Введіть коректну ціну акції");
      return;
    }
    
    const newListing = {
      id: Date.now().toString(),
      sellerId: currentUser.id,
      sellerName: `${currentUser.firstName} ${currentUser.lastName}`,
      sharesCount: amount,
      pricePerShare: price,
      initialPrice: price,
      status: "Активна",
      date: new Date().toISOString(),
      isAuction: false
    };
    
    const updatedStockExchangeItems = [...stockExchangeItems, newListing];
    setStockExchangeItems(updatedStockExchangeItems);
    localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchangeItems));
    
    setOpenSellDialog(false);
    toast.success("Акції виставлено на продаж");
  };
  
  if (loading) {
    return <div className="container py-16 text-center">Завантаження...</div>;
  }

  if (!isAuthenticated() || !currentUser) {
    return <div className="container py-16 text-center">Перенаправлення на сторінку авторизації...</div>;
  }

  if (!currentUser.isShareHolder) {
    return <div className="container py-16 text-center">Доступ заборонено: потрібен статус акціонера</div>;
  }

  const myOffers = stockExchangeItems.filter(item => item.sellerId === currentUser.id);
  const myTransactions = sharesTransactions.filter(t => 
    t.sellerId === currentUser.id || t.buyerId === currentUser.id
  );
  const activeListings = stockExchangeItems.filter(item => 
    item.status === "Активна" && item.sellerId !== currentUser.id
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        <Sidebar className="hidden lg:block col-span-3" />
        
        <main className="col-span-12 lg:col-span-9">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Ринок акцій</h1>
              <p className="text-muted-foreground">Керуйте своїми акціями та інвестиціями</p>
            </div>
            <Button onClick={openSellSharesDialog}>
              <TrendingUp className="h-4 w-4 mr-2" /> Продати акції
            </Button>
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ваші акції</p>
                  <h3 className="text-2xl font-bold mt-1">{currentUser.shares || 0}</h3>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-700">
                  <PieChart className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ціна акції</p>
                  <h3 className="text-2xl font-bold mt-1">{stockPrice.toFixed(2)} грн</h3>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-700">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ваш прибуток</p>
                  <h3 className="text-2xl font-bold mt-1">{currentUser.profit?.toFixed(2) || "0.00"} грн</h3>
                </div>
                <div className="p-3 rounded-full bg-amber-100 text-amber-700">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="market" className="w-full space-y-4">
            <TabsList>
              <TabsTrigger value="market">Ринок акцій</TabsTrigger>
              <TabsTrigger value="my-offers">Мої пропозиції</TabsTrigger>
              <TabsTrigger value="transactions">Мої транзакції</TabsTrigger>
              <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
            </TabsList>
            
            <TabsContent value="market">
              <Card>
                <CardHeader>
                  <CardTitle>Доступні пропозиції акцій</CardTitle>
                  <CardDescription>
                    Перегляньте та придбайте акції у інших акціонерів
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeListings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Продавець</th>
                            <th className="text-left p-2">Кількість акцій</th>
                            <th className="text-left p-2">Ціна за акцію</th>
                            <th className="text-left p-2">Сума</th>
                            <th className="text-left p-2">Динаміка ціни</th>
                            <th className="text-left p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeListings.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{item.sellerName}</td>
                              <td className="p-2">{item.sharesCount}</td>
                              <td className="p-2">{item.pricePerShare.toFixed(2)} грн</td>
                              <td className="p-2">{(item.sharesCount * item.pricePerShare).toFixed(2)} грн</td>
                              <td className="p-2">
                                {item.pricePerShare > stockPrice ? (
                                  <span className="flex items-center text-red-500">
                                    <TrendingUp className="h-4 w-4 mr-1" /> 
                                    {(((item.pricePerShare - stockPrice) / stockPrice) * 100).toFixed(1)}%
                                  </span>
                                ) : item.pricePerShare < stockPrice ? (
                                  <span className="flex items-center text-green-500">
                                    <TrendingDown className="h-4 w-4 mr-1" /> 
                                    {(((stockPrice - item.pricePerShare) / stockPrice) * 100).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">0%</span>
                                )}
                              </td>
                              <td className="p-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleBuyOffer(item)}
                                >
                                  <ShoppingBag className="h-4 w-4 mr-1" /> Купити
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">Немає доступних пропозицій</h3>
                      <p className="text-muted-foreground">
                        Наразі немає акцій, виставлених на продаж іншими акціонерами
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="my-offers">
              <Card>
                <CardHeader>
                  <CardTitle>Мої пропозиції на продаж</CardTitle>
                  <CardDescription>
                    Перегляньте статус своїх акцій, виставлених на продаж
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myOffers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Дата</th>
                            <th className="text-left p-2">Кількість акцій</th>
                            <th className="text-left p-2">Ціна за акцію</th>
                            <th className="text-left p-2">Загальна сума</th>
                            <th className="text-left p-2">Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myOffers.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
                              <td className="p-2">{item.sharesCount}</td>
                              <td className="p-2">{item.pricePerShare.toFixed(2)} грн</td>
                              <td className="p-2">{(item.sharesCount * item.pricePerShare).toFixed(2)} грн</td>
                              <td className="p-2">
                                <Badge variant={
                                  item.status === "Активна" ? "secondary" : 
                                  item.status === "В процесі продажу" ? "outline" : "default"
                                }>
                                  {item.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">У вас немає активних пропозицій</h3>
                      <p className="text-muted-foreground mb-3">
                        Ви можете виставити свої акції на продаж, натиснувши кнопку "Продати акції"
                      </p>
                      <Button onClick={openSellSharesDialog}>
                        <TrendingUp className="h-4 w-4 mr-2" /> Продати акції
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Мої транзакції</CardTitle>
                  <CardDescription>
                    Історія та статус ваших транзакцій купівлі-продажу акцій
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Дата</th>
                            <th className="text-left p-2">Тип</th>
                            <th className="text-left p-2">Контрагент</th>
                            <th className="text-left p-2">Кількість акцій</th>
                            <th className="text-left p-2">Сума</th>
                            <th className="text-left p-2">Статус</th>
                            <th className="text-left p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {myTransactions.map((transaction) => (
                            <tr key={transaction.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                              <td className="p-2">
                                {transaction.sellerId === currentUser.id ? "Продаж" : "Купівля"}
                              </td>
                              <td className="p-2">
                                {transaction.sellerId === currentUser.id 
                                  ? transaction.buyerName 
                                  : transaction.sellerName}
                              </td>
                              <td className="p-2">{transaction.sharesCount}</td>
                              <td className="p-2">{transaction.totalAmount.toFixed(2)} грн</td>
                              <td className="p-2">
                                <Badge variant={
                                  transaction.status === "Завершено" ? "secondary" : 
                                  transaction.status === "Відхилено" || transaction.status === "Скасовано" 
                                    ? "destructive" : "outline"
                                }>
                                  {transaction.status}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openTransactionDetails(transaction)}
                                >
                                  Деталі
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">У вас ще немає транзакцій</h3>
                      <p className="text-muted-foreground">
                        Історія ваших транзакцій з'явиться тут після купівлі або продажу акцій
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="shareholders">
              <Card>
                <CardHeader>
                  <CardTitle>Список акціонерів</CardTitle>
                  <CardDescription>
                    Перегляд інформації про всіх акціонерів компанії
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Акціонер</th>
                          <th className="text-left p-2">Кількість акцій</th>
                          <th className="text-left p-2">Частка</th>
                          <th className="text-left p-2">Титул</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shareholders.map((shareholder) => (
                          <tr key={shareholder.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={shareholder.avatarUrl} alt={`${shareholder.firstName} ${shareholder.lastName}`} />
                                  <AvatarFallback>{shareholder.firstName?.[0]}{shareholder.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  {shareholder.firstName} {shareholder.lastName}
                                  {shareholder.id === currentUser.id && (
                                    <span className="text-xs text-muted-foreground ml-1">(Ви)</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-2">{shareholder.shares || 0}</td>
                            <td className="p-2">{shareholder.percentage || 0}%</td>
                            <td className="p-2">{shareholder.title || "Магнат"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      <Dialog open={openBuyDialog} onOpenChange={setOpenBuyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Купівля акцій</DialogTitle>
            <DialogDescription>
              Введіть кількість акцій, яку бажаєте придбати
            </DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p><span className="font-medium">Продавець:</span> {selectedOffer.sellerName}</p>
                <p><span className="font-medium">Доступно акцій:</span> {selectedOffer.sharesCount}</p>
                <p><span className="font-medium">Ціна за акцію:</span> {selectedOffer.pricePerShare.toFixed(2)} грн</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="buy-amount">
                  Кількість акцій для купівлі:
                </label>
                <Input
                  id="buy-amount"
                  type="number"
                  min="1"
                  max={selectedOffer.sharesCount}
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                />
              </div>
              
              <div className="border-t pt-4">
                <p className="font-medium">Сумарна вартість:</p>
                <p className="text-2xl font-bold">
                  {(parseInt(buyAmount) * selectedOffer.pricePerShare || 0).toFixed(2)} грн
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBuyDialog(false)}>
              Скасувати
            </Button>
            <Button onClick={confirmBuy}>
              Купити акції
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Деталі транзакції</DialogTitle>
            <DialogDescription>
              Інформація про транзакцію та комунікація з контрагентом
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Продавець:</p>
                  <p>{selectedTransaction.sellerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Покупець:</p>
                  <p>{selectedTransaction.buyerName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Кількість акцій:</p>
                  <p>{selectedTransaction.sharesCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Ціна за акцію:</p>
                  <p>{selectedTransaction.pricePerShare.toFixed(2)} грн</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Загальна сума:</p>
                <p className="text-lg font-bold">{selectedTransaction.totalAmount.toFixed(2)} грн</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium">Статус:</p>
                  <Badge variant="secondary">{selectedTransaction.status}</Badge>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {(selectedTransaction.sellerId === currentUser.id && !selectedTransaction.sellerConfirmed ||
                    selectedTransaction.buyerId === currentUser.id && !selectedTransaction.buyerConfirmed) && 
                    selectedTransaction.status === "Очікує підтвердження" && (
                    <Button size="sm" onClick={confirmTransaction}>
                      Підтвердити
                    </Button>
                  )}
                  {selectedTransaction.status === "Очікує підтвердження" && (
                    <Button size="sm" variant="destructive" onClick={cancelTransaction}>
                      Скасувати
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Повідомлення:</p>
                </div>
                <div className="max-h-[150px] overflow-y-auto border p-2 rounded-md bg-muted/50 mb-3">
                  {selectedTransaction.messages && selectedTransaction.messages.length > 0 ? (
                    selectedTransaction.messages.map((msg: any, i: number) => (
                      <div key={i} className="mb-2">
                        <p className="text-sm font-medium">{msg.sender}:</p>
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(msg.date).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Немає повідомлень</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введіть повідомлення..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button size="sm" onClick={sendMessage}>
                    <MessageSquare className="h-4 w-4 mr-1" /> Надіслати
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={openSellDialog} onOpenChange={setOpenSellDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Продаж акцій</DialogTitle>
            <DialogDescription>
              Введіть дані для виставлення акцій на продаж
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p><span className="font-medium">Поточний баланс акцій:</span> {currentUser.shares || 0}</p>
              <p><span className="font-medium">Рекомендована ціна за акцію:</span> {stockPrice.toFixed(2)} грн</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="shares-count">
                Кількість акцій для продажу:
              </label>
              <Input
                id="shares-count"
                type="number"
                min="1"
                max={currentUser.shares || 0}
                value={sharesCount}
                onChange={(e) => setSharesCount(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="share-price">
                Ціна за одну акцію (грн):
              </label>
              <Input
                id="share-price"
                type="number"
                min="1"
                value={sharePrice}
                onChange={(e) => setSharePrice(e.target.value)}
              />
            </div>
            
            <div className="border-t pt-4">
              <p className="font-medium">Сумарна вартість:</p>
              <p className="text-2xl font-bold">
                {(parseInt(sharesCount) * parseFloat(sharePrice) || 0).toFixed(2)} грн
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSellDialog(false)}>
              Скасувати
            </Button>
            <Button onClick={sellShares}>
              Виставити на продаж
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
