
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  PieChart,
  AlertCircle,
  FileText,
  HandshakeIcon
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
          title: p.title || 'Співвласник',
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
      toast.error("Доступ заборонено: Необхідний статус співвласника");
      navigate("/");
      return;
    }
    setSharePrice(sharePriceUsd.toString());
    loadMarketData();
  }, [navigate, loading, isAuthenticated, currentUser, sharePriceUsd, loadMarketData]);

  const handleRequestTransfer = (offer: MarketListing) => {
    if (offer.seller_id === currentUser?.id) {
      toast.error("Ви не можете подати заявку на власну пропозицію");
      return;
    }
    setSelectedOffer(offer);
    setBuyAmount("1");
    setOpenBuyDialog(true);
  };

  const confirmTransferRequest = async () => {
    if (!selectedOffer || !currentUser) return;
    const amount = parseInt(buyAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedOffer.quantity) {
      toast.error(`Введіть коректну кількість часток (1-${selectedOffer.quantity})`);
      return;
    }

    const totalPrice = amount * selectedOffer.price_per_share;

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
      toast.error("Не вдалося створити заявку на отримання частки");
      return;
    }

    // Update listing status
    const { error: marketError } = await supabase
      .from('market')
      .update({ status: 'pending_confirmation', buyer_id: currentUser.id, updated_at: new Date().toISOString() })
      .eq('id', selectedOffer.id);

    if (marketError) {
      console.error("Error updating listing:", marketError);
    }

    setOpenBuyDialog(false);
    toast.success("Заявку на отримання частки подано. Очікуйте підтвердження адміністратором після офлайн-домовленості.");
    await loadMarketData();
  };

  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenDetailsDialog(true);
  };

  const cancelTransaction = async () => {
    if (!selectedTransaction) return;
    
    if (selectedTransaction.status !== 'pending') {
      toast.error("Цю заявку не можна скасувати");
      return;
    }

    if (selectedTransaction.share_id) {
      await supabase
        .from('market')
        .update({ status: 'active', buyer_id: null, updated_at: new Date().toISOString() })
        .eq('id', selectedTransaction.share_id);
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', selectedTransaction.id)
      .eq('buyer_id', currentUser?.id || '');

    if (error) {
      console.error("Error cancelling:", error);
      toast.error("Не вдалося скасувати заявку");
      return;
    }

    setOpenDetailsDialog(false);
    toast.success("Заявку скасовано");
    await loadMarketData();
  };

  const openSellSharesDialog = () => {
    setSharesCount("1");
    setSharePrice(stockPrice.toString());
    setOpenSellDialog(true);
  };

  const createProposal = async () => {
    if (!currentUser) return;
    const amount = parseInt(sharesCount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Введіть коректну кількість часток");
      return;
    }
    if (amount > myShares) {
      toast.error(`У вас недостатньо часток. Ваш баланс: ${myShares}`);
      return;
    }
    const price = parseFloat(sharePrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Введіть коректну орієнтовну вартість");
      return;
    }

    const { error } = await supabase.from('market').insert({
      seller_id: currentUser.id,
      quantity: amount,
      price_per_share: price,
      status: 'active',
    });

    if (error) {
      console.error("Error creating listing:", error);
      toast.error("Не вдалося створити пропозицію");
      return;
    }

    setOpenSellDialog(false);
    toast.success("Пропозицію на передачу частки опубліковано");
    await loadMarketData();
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'pending': return 'Очікує розгляду';
      case 'pending_confirmation': return 'Очікує підтвердження';
      case 'awaiting_offline_deal': return 'Очікує офлайн-домовленості';
      case 'approved': return 'Підтверджено';
      case 'completed': return 'Передачу завершено';
      case 'rejected': return 'Відхилено';
      case 'cancelled': return 'Скасовано';
      case 'sold': return 'Передано';
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
    return <div className="container py-16 text-center">Доступ заборонено: потрібен статус співвласника</div>;
  }

  const myOffers = listings.filter(item => item.seller_id === currentUser.id);
  const activeListings = listings.filter(item => item.status === 'active' && item.seller_id !== currentUser.id);
  const myPercentage = totalShares > 0 ? ((myShares / totalShares) * 100).toFixed(2) : '0.00';

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
              <p className="text-muted-foreground">Перегляд та управління вашими акціями в компанії</p>
            </div>
            <Button onClick={openSellSharesDialog}>
              <TrendingUp className="h-4 w-4 mr-2" /> Передати акції
            </Button>
          </div>

          {/* Info Banner */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 mb-6">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Передача акцій відбувається за реальною офлайн-домовленістю сторін. Тут ви можете опублікувати намір передати акції або подати заявку на отримання. Адміністратор підтверджує факт передачі після реальної домовленості.
              </p>
            </CardContent>
          </Card>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ваші акції</p>
                  <h3 className="text-2xl font-bold mt-1">{myShares}</h3>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <PieChart className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ваш відсоток</p>
                  <h3 className="text-2xl font-bold mt-1">{myPercentage}%</h3>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <FileText className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Орієнт. вартість</p>
                  <h3 className="text-2xl font-bold mt-1">{(myShares * stockPrice).toFixed(2)} USD</h3>
                </div>
                <div className="p-3 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <HandshakeIcon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="market" className="w-full space-y-4">
            <TabsList>
              <TabsTrigger value="market">Пропозиції</TabsTrigger>
              <TabsTrigger value="my-offers">Мої пропозиції</TabsTrigger>
              <TabsTrigger value="transactions">Мої заявки</TabsTrigger>
              <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
            </TabsList>
            
            <TabsContent value="market">
              <Card>
                <CardHeader>
                  <CardTitle>Пропозиції на передачу акцій</CardTitle>
                  <CardDescription>Перегляньте та подайте заявку на отримання акцій</CardDescription>
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
                            <th className="text-left p-2">Акціонер</th>
                            <th className="text-left p-2">Кількість акцій</th>
                            <th className="text-left p-2">Орієнт. вартість за акцію</th>
                            <th className="text-left p-2">Орієнт. загальна вартість</th>
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
                                <Button size="sm" onClick={() => handleRequestTransfer(item)}>
                                  <HandshakeIcon className="h-4 w-4 mr-1" /> Подати заявку
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">Немає активних пропозицій</h3>
                      <p className="text-muted-foreground">Наразі ніхто не пропонує передачу акцій</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="my-offers">
              <Card>
                <CardHeader>
                  <CardTitle>Мої пропозиції на передачу</CardTitle>
                  <CardDescription>Перегляньте статус ваших пропозицій передачі акцій</CardDescription>
                </CardHeader>
                <CardContent>
                  {myOffers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Дата</th>
                            <th className="text-left p-2">Кількість часток</th>
                            <th className="text-left p-2">Орієнт. вартість за частку</th>
                            <th className="text-left p-2">Орієнт. загальна вартість</th>
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
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">У вас немає пропозицій</h3>
                      <p className="text-muted-foreground mb-3">Ви можете опублікувати намір передати частку</p>
                      <Button onClick={openSellSharesDialog}>
                        <TrendingUp className="h-4 w-4 mr-2" /> Передати частку
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Мої заявки</CardTitle>
                  <CardDescription>Історія та статус ваших заявок на передачу часток</CardDescription>
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
                            <th className="text-left p-2">Кількість</th>
                            <th className="text-left p-2">Орієнт. вартість</th>
                            <th className="text-left p-2">Статус</th>
                            <th className="text-left p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {myTransactions.map((tx) => (
                            <tr key={tx.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                              <td className="p-2">
                                {tx.seller_id === currentUser.id ? "Передача" : "Отримання"}
                              </td>
                              <td className="p-2">
                                {tx.seller_id === currentUser.id ? tx.buyer_name : tx.seller_name}
                              </td>
                              <td className="p-2">{tx.quantity}</td>
                              <td className="p-2">{tx.total_price.toFixed(2)} USD</td>
                              <td className="p-2">
                                <Badge variant={
                                  tx.status === 'approved' || tx.status === 'completed' ? "secondary" : 
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
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">У вас ще немає заявок</h3>
                      <p className="text-muted-foreground">Історія ваших заявок з'явиться тут після подачі або отримання заявки на передачу частки</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="shareholders">
              <Card>
                <CardHeader>
                  <CardTitle>Список співвласників</CardTitle>
                  <CardDescription>Перегляд інформації про всіх співвласників компанії</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Співвласник</th>
                          <th className="text-left p-2">Кількість часток</th>
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
      
      {/* Request Transfer Dialog */}
      <Dialog open={openBuyDialog} onOpenChange={setOpenBuyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Заявка на отримання частки</DialogTitle>
            <DialogDescription>Подайте заявку на отримання частки. Передача відбудеться після офлайн-домовленості та підтвердження адміністратором.</DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p><span className="font-medium">Від кого:</span> {selectedOffer.seller_name}</p>
                <p><span className="font-medium">Доступно часток:</span> {selectedOffer.quantity}</p>
                <p><span className="font-medium">Орієнт. вартість за частку:</span> {selectedOffer.price_per_share.toFixed(2)} USD</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="buy-amount">Кількість часток:</label>
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
                <p className="font-medium">Орієнтовна вартість:</p>
                <p className="text-2xl font-bold">
                  {(parseInt(buyAmount) * selectedOffer.price_per_share || 0).toFixed(2)} USD
                </p>
                <p className="text-xs text-muted-foreground mt-1">Фактичні умови передачі обговорюються офлайн між сторонами</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBuyDialog(false)}>Скасувати</Button>
            <Button onClick={confirmTransferRequest}>Подати заявку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transaction Details Dialog */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Деталі заявки</DialogTitle>
            <DialogDescription>Інформація про заявку на передачу частки</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Від кого (передає):</p>
                  <p>{selectedTransaction.seller_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Кому (отримує):</p>
                  <p>{selectedTransaction.buyer_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Кількість часток:</p>
                  <p>{selectedTransaction.quantity}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Орієнт. вартість:</p>
                  <p>{selectedTransaction.total_price.toFixed(2)} USD</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium">Статус:</p>
                  <Badge variant={
                    selectedTransaction.status === 'approved' || selectedTransaction.status === 'completed' ? "secondary" :
                    selectedTransaction.status === 'rejected' ? "destructive" : "outline"
                  }>{statusLabel(selectedTransaction.status)}</Badge>
                </div>
                {selectedTransaction.status === 'pending' && selectedTransaction.buyer_id === currentUser.id && (
                  <div className="ml-auto">
                    <Button size="sm" variant="destructive" onClick={cancelTransaction}>
                      Скасувати заявку
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Create Proposal Dialog */}
      <Dialog open={openSellDialog} onOpenChange={setOpenSellDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Пропозиція передачі частки</DialogTitle>
            <DialogDescription>Опублікуйте намір передати частку. Фактична передача відбудеться після офлайн-домовленості та підтвердження адміністратором.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p><span className="font-medium">Ваш поточний баланс часток:</span> {myShares}</p>
              <p><span className="font-medium">Орієнтовна вартість за частку:</span> {stockPrice.toFixed(2)} USD</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="shares-count">Кількість часток для передачі:</label>
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
              <label className="text-sm font-medium" htmlFor="share-price">Орієнтовна вартість за одну частку (USD):</label>
              <Input
                id="share-price"
                type="number"
                min="1"
                value={sharePrice}
                onChange={(e) => setSharePrice(e.target.value)}
              />
            </div>
            <div className="border-t pt-4">
              <p className="font-medium">Орієнтовна загальна вартість:</p>
              <p className="text-2xl font-bold">
                {(parseInt(sharesCount) * parseFloat(sharePrice) || 0).toFixed(2)} USD
              </p>
              <p className="text-xs text-muted-foreground mt-1">Остаточні умови передачі обговорюються офлайн між сторонами</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSellDialog(false)}>Скасувати</Button>
            <Button onClick={createProposal}>Опублікувати пропозицію</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
