
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, MessageCircle, XSquare } from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";

interface MarketListing {
  id: string;
  seller_id: string;
  seller_name: string;
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
  approved_by_admin: boolean;
  created_at: string;
}

export function StockExchangeTab() {
  const { sharePriceUsd, loading: settingsLoading, updateSharePrice } = useCompanySettings();
  const [stockPrice, setStockPrice] = useState<string>("");
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedShareholderId, setSelectedShareholderId] = useState("");
  const [selectedSharesCount, setSelectedSharesCount] = useState("1");
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!settingsLoading) {
      setStockPrice(sharePriceUsd.toString());
    }
  }, [sharePriceUsd, settingsLoading]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Fetch shareholders
      const { data: allUsers, error: usersError } = await supabase.rpc('get_users_for_admin');
      if (usersError) {
        console.error("Error fetching users:", usersError);
      } else {
        const sh = (allUsers || [])
          .filter((u: any) => u.is_shareholder)
          .map((u: any) => {
            const parts = u.full_name ? u.full_name.split(' ') : ['', ''];
            return { id: u.id, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '', shares: 0 };
          });
        
        for (const s of sh) {
          const { data } = await supabase.from('shares').select('quantity').eq('user_id', s.id).limit(1);
          s.shares = data && data.length > 0 ? data[0].quantity : 0;
        }
        setShareholders(sh);
      }

      // Fetch market listings with seller names
      const { data: marketData, error: marketError } = await supabase
        .from('market')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (marketError) {
        console.error("Error fetching market:", marketError);
      } else {
        const listingsWithNames: MarketListing[] = [];
        for (const m of (marketData || [])) {
          const { data: userData } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: [m.seller_id] });
          const sellerName = userData?.[0]?.full_name || 'Невідомий';
          listingsWithNames.push({
            id: m.id,
            seller_id: m.seller_id,
            seller_name: sellerName,
            quantity: m.quantity,
            price_per_share: Number(m.price_per_share),
            status: m.status || 'active',
            created_at: m.created_at,
          });
        }
        setListings(listingsWithNames);
      }

      // Fetch pending transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) {
        console.error("Error fetching transactions:", txError);
      } else {
        const txWithNames: Transaction[] = [];
        const userIds = new Set<string>();
        (txData || []).forEach((t: any) => {
          if (t.seller_id) userIds.add(t.seller_id);
          if (t.buyer_id) userIds.add(t.buyer_id);
        });
        
        let namesMap: Record<string, string> = {};
        if (userIds.size > 0) {
          const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(userIds) });
          (profiles || []).forEach((p: any) => { namesMap[p.id] = p.full_name || 'Невідомий'; });
        }

        for (const t of (txData || [])) {
          txWithNames.push({
            id: t.id,
            share_id: t.share_id,
            seller_id: t.seller_id,
            seller_name: namesMap[t.seller_id] || 'Невідомий',
            buyer_id: t.buyer_id,
            buyer_name: namesMap[t.buyer_id] || 'Невідомий',
            quantity: t.quantity,
            price_per_share: Number(t.price_per_share) || 0,
            total_price: Number(t.total_price),
            status: t.status || 'pending',
            approved_by_admin: t.approved_by_admin || false,
            created_at: t.created_at,
          });
        }
        setTransactions(txWithNames);
      }
    } catch (error) {
      console.error("Error loading stock exchange data:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

  const handleSellShares = async () => {
    if (!selectedShareholderId) {
      toast.error("Виберіть акціонера");
      return;
    }
    const count = parseInt(selectedSharesCount);
    if (!selectedSharesCount || isNaN(count) || count <= 0) {
      toast.error("Введіть коректну кількість акцій");
      return;
    }

    const seller = shareholders.find(sh => sh.id === selectedShareholderId);
    if (!seller) {
      toast.error("Акціонера не знайдено");
      return;
    }
    if (count > (seller.shares || 0)) {
      toast.error(`У акціонера лише ${seller.shares || 0} акцій`);
      return;
    }

    const price = parseFloat(stockPrice) || sharePriceUsd;

    const { error } = await supabase.from('market').insert({
      seller_id: seller.id,
      quantity: count,
      price_per_share: price,
      status: 'active',
    });

    if (error) {
      console.error("Error creating listing:", error);
      toast.error("Не вдалося створити пропозицію");
      return;
    }

    setSelectedShareholderId("");
    setSelectedSharesCount("1");
    toast.success("Акції виставлено на продаж");
    await loadData();
  };

  const openTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenTransactionDialog(true);
  };

  const approveTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase.rpc('approve_share_transaction', { _transaction_id: transactionId });
      if (error) {
        console.error("Error approving transaction:", error);
        const msg = error.message || '';
        if (msg.includes('Недостатньо акцій')) {
          toast.error("Недостатньо акцій у продавця для завершення угоди");
        } else if (msg.includes('вже змінено')) {
          toast.error("Транзакцію вже змінено іншим користувачем");
        } else {
          toast.error("Не вдалося завершити угоду");
        }
        return;
      }
      toast.success("Транзакцію успішно завершено");
      setOpenTransactionDialog(false);
      await loadData();
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Не вдалося завершити угоду");
    }
  };

  const rejectTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase.rpc('reject_share_transaction', { _transaction_id: transactionId });
      if (error) {
        console.error("Error rejecting transaction:", error);
        toast.error("Не вдалося відхилити транзакцію");
        return;
      }
      toast.success("Транзакцію відхилено");
      setOpenTransactionDialog(false);
      await loadData();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Не вдалося відхилити транзакцію");
    }
  };

  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const activeListings = listings.filter(l => l.status === 'active');

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'pending': return 'Очікує підтвердження';
      case 'sold': return 'Продано';
      case 'cancelled': return 'Скасовано';
      case 'completed': return 'Завершено';
      case 'rejected': return 'Відхилено';
      default: return status;
    }
  };

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
                <Select value={selectedShareholderId} onValueChange={setSelectedShareholderId}>
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

      {/* Active Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Активні лоти</CardTitle>
          <CardDescription>Пропозиції на ринку акцій</CardDescription>
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
                    <th className="text-left p-2">Кількість</th>
                    <th className="text-right p-2">Ціна (USD)</th>
                    <th className="text-left p-2">Дата</th>
                    <th className="text-left p-2">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {activeListings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{listing.seller_name}</td>
                      <td className="p-2">{listing.quantity}</td>
                      <td className="p-2 text-right">{listing.price_per_share.toFixed(2)}</td>
                      <td className="p-2">{new Date(listing.created_at).toLocaleDateString()}</td>
                      <td className="p-2"><Badge variant="secondary">{statusLabel(listing.status)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Немає активних лотів</div>
          )}
        </CardContent>
      </Card>

      {/* Pending Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Активні угоди</CardTitle>
          <CardDescription>Транзакції, які очікують на обробку</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Дата</th>
                  <th className="text-left p-2">Продавець</th>
                  <th className="text-left p-2">Покупець</th>
                  <th className="text-left p-2">Кількість</th>
                  <th className="text-right p-2">Сума (USD)</th>
                  <th className="text-left p-2">Статус</th>
                  <th className="text-left p-2">Дії</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransactions.length > 0 ? (
                  pendingTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="p-2">{tx.seller_name}</td>
                      <td className="p-2">{tx.buyer_name}</td>
                      <td className="p-2">{tx.quantity}</td>
                      <td className="p-2 text-right">{tx.total_price.toFixed(2)}</td>
                      <td className="p-2">
                        <Badge variant="outline">{statusLabel(tx.status)}</Badge>
                      </td>
                      <td className="p-2">
                        <Button variant="outline" size="sm" onClick={() => openTransaction(tx)}>
                          <MessageCircle className="h-4 w-4 mr-1" /> Деталі
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-2 text-center text-muted-foreground">
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
              pendingTransactions.map((tx) => (
                <Card key={tx.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                      <Badge variant="outline">{statusLabel(tx.status)}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Продавець:</span>
                      <span>{tx.seller_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Покупець:</span>
                      <span>{tx.buyer_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Кількість:</span>
                      <span>{tx.quantity} акцій</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">{tx.total_price.toFixed(2)} USD</span>
                      <Button variant="outline" size="sm" onClick={() => openTransaction(tx)}>
                        <MessageCircle className="h-4 w-4 mr-1" /> Деталі
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">Немає активних угод</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
        <DialogContent className="max-w-2xl">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle>Деталі транзакції</DialogTitle>
                <DialogDescription>ID: {selectedTransaction.id.substring(0, 8)}...</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Продавець</h3>
                    <p>{selectedTransaction.seller_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Покупець</h3>
                    <p>{selectedTransaction.buyer_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Кількість акцій</h3>
                    <p>{selectedTransaction.quantity}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Ціна за акцію</h3>
                    <p>{selectedTransaction.price_per_share.toFixed(2)} USD</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Загальна сума</h3>
                    <p>{selectedTransaction.total_price.toFixed(2)} USD</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Статус</h3>
                  <Badge variant="outline">{statusLabel(selectedTransaction.status)}</Badge>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={() => rejectTransaction(selectedTransaction.id)}>
                  <XSquare className="h-4 w-4 mr-1" /> Відхилити
                </Button>
                <Button onClick={() => approveTransaction(selectedTransaction.id)}>
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
