
import { useState, useEffect, useCallback } from "react";
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
  PieChart 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";

interface MarketListing {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_avatar?: string;
  quantity: number;
  price_per_share: number;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  share_id: string | null;
  seller_id: string;
  seller_name: string;
  buyer_id: string;
  buyer_name: string;
  quantity: number;
  price_per_share: number;
  total_price: number;
  status: string;
  created_at: string;
}

interface ShareholderInfo {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  shares: number;
  percentage: string;
  title: string;
}

export default function StockMarket() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [shareholders, setShareholders] = useState<ShareholderInfo[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<MarketListing | null>(null);
  const [buyAmount, setBuyAmount] = useState("1");
  const [openBuyDialog, setOpenBuyDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [sharesCount, setSharesCount] = useState("1");
  const [sharePrice, setSharePrice] = useState("");
  const [openSellDialog, setOpenSellDialog] = useState(false);
  const [myShares, setMyShares] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  
  const navigate = useNavigate();
  const { getCurrentUser, isAuthenticated, loading } = useSupabaseAuth();
  const currentUser = getCurrentUser();
  const { sharePriceUsd, totalShares, loading: settingsLoading } = useCompanySettings();
  
  const stockPrice = sharePriceUsd;

  const loadMarketData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingData(true);
    
    try {
      // Load user's own shares
      const { data: sharesData } = await supabase
        .from('shares')
        .select('quantity')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      setMyShares(sharesData?.quantity || 0);

      // Load active market listings
      const { data: marketData } = await supabase
        .from('market')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const sellerIds = new Set<string>();
      (marketData || []).forEach((m: any) => { if (m.seller_id) sellerIds.add(m.seller_id); });

      let namesMap: Record<string, { name: string; avatar?: string }> = {};
      if (sellerIds.size > 0) {
        const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(sellerIds) });
        (profiles || []).forEach((p: any) => { 
          namesMap[p.id] = { name: p.full_name || 'Невідомий', avatar: p.avatar_url }; 
        });
      }

      const formattedListings: MarketListing[] = (marketData || []).map((m: any) => ({
        id: m.id,
        seller_id: m.seller_id,
        seller_name: namesMap[m.seller_id]?.name || 'Невідомий',
        seller_avatar: namesMap[m.seller_id]?.avatar,
        quantity: m.quantity,
        price_per_share: Number(m.price_per_share),
        status: m.status,
        created_at: m.created_at,
      }));
      setListings(formattedListings);

      // Load my transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .or(`seller_id.eq.${currentUser.id},buyer_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      const txUserIds = new Set<string>();
      (txData || []).forEach((t: any) => {
        if (t.seller_id) txUserIds.add(t.seller_id);
        if (t.buyer_id) txUserIds.add(t.buyer_id);
      });

      let txNamesMap: Record<string, string> = {};
      if (txUserIds.size > 0) {
        const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(txUserIds) });
        (profiles || []).forEach((p: any) => { txNamesMap[p.id] = p.full_name || 'Невідомий'; });
      }

      const formattedTx: Transaction[] = (txData || []).map((t: any) => ({
        id: t.id,
        share_id: t.share_id,
        seller_id: t.seller_id,
        seller_name: txNamesMap[t.seller_id] || 'Невідомий',
        buyer_id: t.buyer_id,
        buyer_name: txNamesMap[t.buyer_id] || 'Невідомий',
        quantity: t.quantity,
        price_per_share: Number(t.price_per_share) || 0,
        total_price: Number(t.total_price),
        status: t.status || 'pending',
        created_at: t.created_at,
      }));
      setMyTransactions(formattedTx);

      // Load shareholders list
      const { data: allProfiles } = await supabase.rpc('get_safe_public_profiles');
      const shareholderProfiles = (allProfiles || []).filter((p: any) => p.is_shareholder);
      
      const shList: ShareholderInfo[] = [];
      for (const p of shareholderProfiles) {
        const { data: shData } = await supabase.from('shares').select('quantity').eq('user_id', p.id).maybeSingle();
        const shares = shData?.quantity || 0;
        const pct = totalShares > 0 ? ((shares / totalShares) * 100).toFixed(2) : '0.00';
        const parts = (p.full_name || '').split(' ');
        shList.push({
          id: p.id,
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          avatarUrl: p.avatar_url,
          shares,
          percentage: pct,
          title: p.title || 'Акціонер',
        });
      }
      setShareholders(shList);
    } catch (error) {
      console.error("Error loading market data:", error);
    } finally {
      setLoadingData(false);
    }
  }, [currentUser?.id, totalShares]);
  
  useEffect(() => {
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
    setSharePrice(sharePriceUsd.toString());
    loadMarketData();
  }, [navigate, loading, isAuthenticated, currentUser, sharePriceUsd, loadMarketData]);

  const handleBuyOffer = (offer: MarketListing) => {
    if (offer.seller_id === currentUser?.id) {
      toast.error("Ви не можете купити власні акції");
      return;
    }
    setSelectedOffer(offer);
    setBuyAmount("1");
    setOpenBuyDialog(true);
  };

  const confirmBuy = async () => {
    if (!selectedOffer || !currentUser) return;
    const amount = parseInt(buyAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedOffer.quantity) {
      toast.error(`Введіть коректну кількість акцій (1-${selectedOffer.quantity})`);
      return;
    }

    const totalPrice = amount * selectedOffer.price_per_share;

    // Create transaction
    const { error: txError } = await supabase.from('transactions').insert({
      share_id: selectedOffer.id,
      seller_id: selectedOffer.seller_id,
      buyer_id: currentUser.id,
      quantity: amount,
      price_per_share: selectedOffer.price_per_share,
      total_price: totalPrice,
      status: 'pending',
    });

    if (txError) {
      console.error("Error creating transaction:", txError);
      toast.error("Не вдалося створити запит на купівлю");
      return;
    }

    // Update listing status to pending
    const { error: marketError } = await supabase
      .from('market')
      .update({ status: 'pending', buyer_id: currentUser.id, updated_at: new Date().toISOString() })
      .eq('id', selectedOffer.id);

    if (marketError) {
      console.error("Error updating listing:", marketError);
    }

    setOpenBuyDialog(false);
    toast.success("Запит на купівлю акцій відправлено");
    await loadMarketData();
  };

  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenDetailsDialog(true);
  };

  const cancelTransaction = async () => {
    if (!selectedTransaction) return;
    
    // Only pending transactions can be cancelled by participants
    if (selectedTransaction.status !== 'pending') {
      toast.error("Цю транзакцію не можна скасувати");
      return;
    }

    // Re-activate the listing
    if (selectedTransaction.share_id) {
      await supabase
        .from('market')
        .update({ status: 'active', buyer_id: null, updated_at: new Date().toISOString() })
        .eq('id', selectedTransaction.share_id);
    }

    // Delete the pending transaction (buyer can cancel their own)
    // We use the admin RPC approach or direct delete if buyer
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', selectedTransaction.id)
      .eq('buyer_id', currentUser?.id || '');

    if (error) {
      console.error("Error cancelling:", error);
      toast.error("Не вдалося скасувати транзакцію");
      return;
    }

    setOpenDetailsDialog(false);
    toast.success("Транзакцію скасовано");
    await loadMarketData();
  };

  const openSellSharesDialog = () => {
    setSharesCount("1");
    setSharePrice(stockPrice.toString());
    setOpenSellDialog(true);
  };

  const sellShares = async () => {
    if (!currentUser) return;
    const amount = parseInt(sharesCount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Введіть коректну кількість акцій");
      return;
    }
    if (amount > myShares) {
      toast.error(`У вас недостатньо акцій. Ваш баланс: ${myShares}`);
      return;
    }
    const price = parseFloat(sharePrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Введіть коректну ціну акції");
      return;
    }

    const { error } = await supabase.from('market').insert({
      seller_id: currentUser.id,
      quantity: amount,
      price_per_share: price,
      status: 'active',
    });

    if (error) {
      console.error("Error creating sell listing:", error);
      toast.error("Не вдалося виставити акції на продаж");
      return;
    }

    setOpenSellDialog(false);
    toast.success("Акції виставлено на продаж");
    await loadMarketData();
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'pending': return 'Очікує підтвердження';
      case 'sold': return 'Продано';
      case 'completed': return 'Завершено';
      case 'rejected': return 'Відхилено';
      case 'cancelled': return 'Скасовано';
      default: return status;
    }
  };

  if (loading || settingsLoading) {
    return <div className="container py-16 text-center">Завантаження...</div>;
  }
  if (isAuthenticated() && !currentUser) {
    return <div className="container py-16 text-center">Завантаження даних користувача...</div>;
  }
  if (!isAuthenticated() || !currentUser) {
    return <div className="container py-16 text-center">Перенаправлення на сторінку авторизації...</div>;
  }
  if (!currentUser.isShareHolder) {
    return <div className="container py-16 text-center">Доступ заборонено: потрібен статус акціонера</div>;
  }

  const myOffers = listings.filter(item => item.seller_id === currentUser.id);
  const activeListings = listings.filter(item => item.status === 'active' && item.seller_id !== currentUser.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 items-start gap-0 px-2 sm:px-3 md:px-4 py-6">
        <div className="hidden lg:block col-span-3 sticky top-14 sm:top-16 3xl:top-20 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] 3xl:h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain scrollbar-hide">
          <Sidebar />
        </div>
        
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
                  <h3 className="text-2xl font-bold mt-1">{myShares}</h3>
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
                  <h3 className="text-2xl font-bold mt-1">{stockPrice.toFixed(2)} USD</h3>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-700">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Вартість портфеля</p>
                  <h3 className="text-2xl font-bold mt-1">{(myShares * stockPrice).toFixed(2)} USD</h3>
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
                  <CardDescription>Перегляньте та придбайте акції у інших акціонерів</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : activeListings.length > 0 ? (
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
                              <td className="p-2">{item.seller_name}</td>
                              <td className="p-2">{item.quantity}</td>
                              <td className="p-2">{item.price_per_share.toFixed(2)} USD</td>
                              <td className="p-2">{(item.quantity * item.price_per_share).toFixed(2)} USD</td>
                              <td className="p-2">
                                {item.price_per_share > stockPrice ? (
                                  <span className="flex items-center text-red-500">
                                    <TrendingUp className="h-4 w-4 mr-1" /> 
                                    {(((item.price_per_share - stockPrice) / stockPrice) * 100).toFixed(1)}%
                                  </span>
                                ) : item.price_per_share < stockPrice ? (
                                  <span className="flex items-center text-green-500">
                                    <TrendingDown className="h-4 w-4 mr-1" /> 
                                    {(((stockPrice - item.price_per_share) / stockPrice) * 100).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">0%</span>
                                )}
                              </td>
                              <td className="p-2">
                                <Button size="sm" onClick={() => handleBuyOffer(item)}>
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
                      <p className="text-muted-foreground">Наразі немає акцій, виставлених на продаж іншими акціонерами</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="my-offers">
              <Card>
                <CardHeader>
                  <CardTitle>Мої пропозиції на продаж</CardTitle>
                  <CardDescription>Перегляньте статус своїх акцій, виставлених на продаж</CardDescription>
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
                              <td className="p-2">{new Date(item.created_at).toLocaleDateString()}</td>
                              <td className="p-2">{item.quantity}</td>
                              <td className="p-2">{item.price_per_share.toFixed(2)} USD</td>
                              <td className="p-2">{(item.quantity * item.price_per_share).toFixed(2)} USD</td>
                              <td className="p-2">
                                <Badge variant={item.status === 'active' ? "secondary" : "outline"}>
                                  {statusLabel(item.status)}
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
                      <p className="text-muted-foreground mb-3">Ви можете виставити свої акції на продаж</p>
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
                  <CardDescription>Історія та статус ваших транзакцій купівлі-продажу акцій</CardDescription>
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
                          {myTransactions.map((tx) => (
                            <tr key={tx.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                              <td className="p-2">
                                {tx.seller_id === currentUser.id ? "Продаж" : "Купівля"}
                              </td>
                              <td className="p-2">
                                {tx.seller_id === currentUser.id ? tx.buyer_name : tx.seller_name}
                              </td>
                              <td className="p-2">{tx.quantity}</td>
                              <td className="p-2">{tx.total_price.toFixed(2)} USD</td>
                              <td className="p-2">
                                <Badge variant={
                                  tx.status === 'completed' ? "secondary" : 
                                  tx.status === 'rejected' ? "destructive" : "outline"
                                }>
                                  {statusLabel(tx.status)}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <Button size="sm" variant="outline" onClick={() => openTransactionDetails(tx)}>
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
                      <p className="text-muted-foreground">Історія ваших транзакцій з'явиться тут після купівлі або продажу акцій</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="shareholders">
              <Card>
                <CardHeader>
                  <CardTitle>Список акціонерів</CardTitle>
                  <CardDescription>Перегляд інформації про всіх акціонерів компанії</CardDescription>
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
                        {shareholders.map((sh) => (
                          <tr key={sh.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={sh.avatarUrl} alt={`${sh.firstName} ${sh.lastName}`} />
                                  <AvatarFallback>{sh.firstName?.[0]}{sh.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  {sh.firstName} {sh.lastName}
                                  {sh.id === currentUser.id && (
                                    <span className="text-xs text-muted-foreground ml-1">(Ви)</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-2">{sh.shares}</td>
                            <td className="p-2">{sh.percentage}%</td>
                            <td className="p-2">{sh.title}</td>
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
      
      {/* Buy Dialog */}
      <Dialog open={openBuyDialog} onOpenChange={setOpenBuyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Купівля акцій</DialogTitle>
            <DialogDescription>Введіть кількість акцій, яку бажаєте придбати</DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p><span className="font-medium">Продавець:</span> {selectedOffer.seller_name}</p>
                <p><span className="font-medium">Доступно акцій:</span> {selectedOffer.quantity}</p>
                <p><span className="font-medium">Ціна за акцію:</span> {selectedOffer.price_per_share.toFixed(2)} USD</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="buy-amount">Кількість акцій для купівлі:</label>
                <Input
                  id="buy-amount"
                  type="number"
                  min="1"
                  max={selectedOffer.quantity}
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                />
              </div>
              <div className="border-t pt-4">
                <p className="font-medium">Сумарна вартість:</p>
                <p className="text-2xl font-bold">
                  {(parseInt(buyAmount) * selectedOffer.price_per_share || 0).toFixed(2)} USD
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBuyDialog(false)}>Скасувати</Button>
            <Button onClick={confirmBuy}>Купити акції</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transaction Details Dialog */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Деталі транзакції</DialogTitle>
            <DialogDescription>Інформація про транзакцію</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Продавець:</p>
                  <p>{selectedTransaction.seller_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Покупець:</p>
                  <p>{selectedTransaction.buyer_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Кількість акцій:</p>
                  <p>{selectedTransaction.quantity}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Ціна за акцію:</p>
                  <p>{selectedTransaction.price_per_share.toFixed(2)} USD</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Загальна сума:</p>
                <p className="text-lg font-bold">{selectedTransaction.total_price.toFixed(2)} USD</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium">Статус:</p>
                  <Badge variant="secondary">{statusLabel(selectedTransaction.status)}</Badge>
                </div>
                {selectedTransaction.status === 'pending' && selectedTransaction.buyer_id === currentUser.id && (
                  <div className="ml-auto">
                    <Button size="sm" variant="destructive" onClick={cancelTransaction}>
                      Скасувати
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Sell Dialog */}
      <Dialog open={openSellDialog} onOpenChange={setOpenSellDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Продаж акцій</DialogTitle>
            <DialogDescription>Введіть дані для виставлення акцій на продаж</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p><span className="font-medium">Поточний баланс акцій:</span> {myShares}</p>
              <p><span className="font-medium">Рекомендована ціна за акцію:</span> {stockPrice.toFixed(2)} USD</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="shares-count">Кількість акцій для продажу:</label>
              <Input
                id="shares-count"
                type="number"
                min="1"
                max={myShares}
                value={sharesCount}
                onChange={(e) => setSharesCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="share-price">Ціна за одну акцію (USD):</label>
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
                {(parseInt(sharesCount) * parseFloat(sharePrice) || 0).toFixed(2)} USD
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSellDialog(false)}>Скасувати</Button>
            <Button onClick={sellShares}>Виставити на продаж</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
