
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, MessageCircle, XSquare, AlertCircle } from "lucide-react";
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
  notes?: string;
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
        const sellerIds = new Set<string>();
        (marketData || []).forEach((m: any) => { if (m.seller_id) sellerIds.add(m.seller_id); });

        let namesMap: Record<string, string> = {};
        if (sellerIds.size > 0) {
          const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: Array.from(sellerIds) });
          (profiles || []).forEach((p: any) => { namesMap[p.id] = p.full_name || 'Невідомий'; });
        }

        for (const m of (marketData || [])) {
          listingsWithNames.push({
            id: m.id,
            seller_id: m.seller_id,
            seller_name: namesMap[m.seller_id] || 'Невідомий',
            quantity: m.quantity,
            price_per_share: Number(m.price_per_share),
            status: m.status || 'active',
            created_at: m.created_at,
            notes: m.notes,
          });
        }
        setListings(listingsWithNames);
      }

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) {
        console.error("Error fetching transactions:", txError);
      } else {
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

        const txWithNames: Transaction[] = (txData || []).map((t: any) => ({
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
        }));
        setTransactions(txWithNames);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStockPriceHandler = async () => {
    const price = parseFloat(stockPrice);
    if (!stockPrice || isNaN(price) || price <= 0) {
      toast.error("Введіть коректну орієнтовну вартість акції");
      return;
    }
    const success = await updateSharePrice(price);
    if (success) {
      toast.success(`Орієнтовну вартість акції оновлено: ${price} USD`);
    }
  };

  const handleCreateProposal = async () => {
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
    toast.success("Пропозицію на передачу акцій створено");
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
        console.error("Error approving:", error);
        const msg = error.message || '';
        if (msg.includes('Недостатньо часток')) {
          toast.error("Недостатньо часток у продавця для завершення передачі");
        } else if (msg.includes('вже змінено')) {
          toast.error("Заявку вже змінено іншим користувачем");
        } else {
          toast.error("Не вдалося підтвердити передачу акцій");
        }
        return;
      }
      toast.success("Передачу акцій підтверджено");
      setOpenTransactionDialog(false);
      await loadData();
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Не вдалося підтвердити передачу акцій");
    }
  };

  const rejectTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase.rpc('reject_share_transaction', { _transaction_id: transactionId });
      if (error) {
        console.error("Error rejecting:", error);
        toast.error("Не вдалося відхилити заявку");
        return;
      }
      toast.success("Заявку відхилено");
      setOpenTransactionDialog(false);
      await loadData();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Не вдалося відхилити заявку");
    }
  };

  const pendingTransactions = transactions.filter(t => t.status === 'pending' || t.status === 'awaiting_offline_deal');
  const activeListings = listings.filter(l => l.status === 'active');

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

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed': return 'secondary' as const;
      case 'rejected':
      case 'cancelled': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Система обліку акцій</p>
            <p>Цей модуль призначений для обліку внутрішніх акцій компанії. Передача акцій відбувається за реальною офлайн-домовленістю сторін. Адміністратор лише підтверджує факт передачі в системі.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Орієнтовна вартість акції</CardTitle>
          <CardDescription>Довідкова орієнтовна вартість однієї акції (USD)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="stock-price">Вартість акції (USD)</Label>
              <Input
                id="stock-price"
                type="number"
                placeholder="10"
                value={stockPrice}
                onChange={(e) => setStockPrice(e.target.value)}
                disabled={settingsLoading}
              />
            </div>
            <Button onClick={updateStockPriceHandler} disabled={settingsLoading}>Оновити</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Створити пропозицію передачі акцій</CardTitle>
          <CardDescription>Опублікуйте намір акціонера передати акції</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shareholder">Співвласник</Label>
                <Select value={selectedShareholderId} onValueChange={setSelectedShareholderId}>
                  <SelectTrigger id="shareholder">
                    <SelectValue placeholder="Виберіть співвласника" />
                  </SelectTrigger>
                  <SelectContent>
                    {shareholders.map((sh) => (
                      <SelectItem key={sh.id} value={sh.id}>
                        {sh.firstName} {sh.lastName} ({sh.shares || 0} часток)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shares-count">Кількість часток</Label>
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
            <Button onClick={handleCreateProposal}>Створити пропозицію</Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Активні пропозиції</CardTitle>
          <CardDescription>Пропозиції на передачу часток між співвласниками</CardDescription>
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
                    <th className="text-left p-2">Співвласник</th>
                    <th className="text-left p-2">Кількість</th>
                    <th className="text-right p-2">Орієнтовна вартість (USD)</th>
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
            <div className="text-center py-8 text-muted-foreground">Немає активних пропозицій</div>
          )}
        </CardContent>
      </Card>

      {/* Pending Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Заявки на передачу часток</CardTitle>
          <CardDescription>Заявки, які очікують підтвердження адміністратором після офлайн-домовленості</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Дата</th>
                  <th className="text-left p-2">Від кого</th>
                  <th className="text-left p-2">Кому</th>
                  <th className="text-left p-2">Кількість</th>
                  <th className="text-right p-2">Орієнт. вартість (USD)</th>
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
                        <Badge variant={statusBadgeVariant(tx.status)}>{statusLabel(tx.status)}</Badge>
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
                      Немає заявок, що очікують розгляду
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
                      <Badge variant={statusBadgeVariant(tx.status)}>{statusLabel(tx.status)}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Від кого:</span>
                      <span>{tx.seller_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Кому:</span>
                      <span>{tx.buyer_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Кількість:</span>
                      <span>{tx.quantity} часток</span>
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
              <div className="text-center py-8 text-muted-foreground">Немає заявок, що очікують розгляду</div>
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
                <DialogTitle>Деталі заявки на передачу частки</DialogTitle>
                <DialogDescription>ID: {selectedTransaction.id.substring(0, 8)}...</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Від кого (передає)</h3>
                    <p>{selectedTransaction.seller_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Кому (отримує)</h3>
                    <p>{selectedTransaction.buyer_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Кількість часток</h3>
                    <p>{selectedTransaction.quantity}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Орієнт. вартість за частку</h3>
                    <p>{selectedTransaction.price_per_share.toFixed(2)} USD</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Орієнт. загальна вартість</h3>
                    <p>{selectedTransaction.total_price.toFixed(2)} USD</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Статус</h3>
                  <Badge variant={statusBadgeVariant(selectedTransaction.status)}>{statusLabel(selectedTransaction.status)}</Badge>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground">
                    Підтвердження означає, що реальна офлайн-передача частки вже відбулась. 
                    Після підтвердження частки будуть перерозподілені в системі.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={() => rejectTransaction(selectedTransaction.id)}>
                  <XSquare className="h-4 w-4 mr-1" /> Відхилити
                </Button>
                <Button onClick={() => approveTransaction(selectedTransaction.id)}>
                  <CheckSquare className="h-4 w-4 mr-1" /> Підтвердити передачу
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
