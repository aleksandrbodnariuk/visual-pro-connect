
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, MessageCircle, XSquare, AlertCircle, UserPlus, UserMinus, Shield } from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

/* ── Stock Market Access Manager ── */

interface AccessUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  shares: number;
  accessRole: 'none' | 'candidate' | 'shareholder';
}

function StockMarketAccessManager() {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [filter, setFilter] = useState<'all' | 'candidate' | 'shareholder' | 'none'>('all');

  const loadAccessData = useCallback(async () => {
    setLoadingAccess(true);
    try {
      const { data: allUsers } = await supabase.rpc('get_users_for_admin');
      if (!allUsers) return;

      const userIds = allUsers.map((u: any) => u.id);

      // Batch: fetch all roles and shares in parallel instead of N+1
      const [rolesResults, sharesResults] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
        supabase.from('shares').select('user_id, quantity').in('user_id', userIds),
      ]);

      // Build maps
      const rolesByUserId: Record<string, string[]> = {};
      (rolesResults.data || []).forEach((r: any) => {
        if (!rolesByUserId[r.user_id]) rolesByUserId[r.user_id] = [];
        rolesByUserId[r.user_id].push(r.role);
      });

      const sharesByUserId: Record<string, number> = {};
      (sharesResults.data || []).forEach((s: any) => {
        sharesByUserId[s.user_id] = s.quantity || 0;
      });

      const result: AccessUser[] = [];
      for (const u of allUsers) {
        const rolesArr = rolesByUserId[u.id] || [];

        // Skip founders/admins from this list (they always have access)
        if (rolesArr.includes('founder') || rolesArr.includes('admin')) continue;

        let accessRole: 'none' | 'candidate' | 'shareholder' = 'none';
        if (rolesArr.includes('shareholder')) accessRole = 'shareholder';
        else if (rolesArr.includes('candidate')) accessRole = 'candidate';

        result.push({
          id: u.id,
          full_name: u.full_name || 'Без імені',
          avatar_url: u.avatar_url || undefined,
          shares: sharesByUserId[u.id] || 0,
          accessRole,
        });
      }
      setUsers(result);
    } catch (e) {
      console.error('Error loading access data:', e);
    } finally {
      setLoadingAccess(false);
    }
  }, []);

  useEffect(() => { loadAccessData(); }, [loadAccessData]);

  const setAccess = async (userId: string, newRole: 'candidate' | 'shareholder' | 'none') => {
    try {
      const { error } = await supabase.rpc('set_stock_market_access', {
        _user_id: userId,
        _access: newRole,
      });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('володіє акціями')) {
          toast.error('Не можна забрати доступ у користувача, який володіє акціями');
        } else if (msg.includes('понизити до кандидата')) {
          toast.error('Не можна понизити до кандидата користувача з акціями');
        } else {
          toast.error(msg || 'Помилка зміни доступу');
        }
        return;
      }
      toast.success(
        newRole === 'candidate' ? 'Надано доступ кандидата' :
        newRole === 'shareholder' ? 'Надано статус акціонера' :
        'Доступ до ринку знято'
      );
      await loadAccessData();
    } catch {
      toast.error('Помилка зміни доступу');
    }
  };

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.accessRole === filter);

  const accessLabel = (role: string) => {
    switch (role) {
      case 'candidate': return 'Кандидат';
      case 'shareholder': return 'Акціонер';
      default: return 'Немає доступу';
    }
  };

  const accessBadgeVariant = (role: string) => {
    switch (role) {
      case 'shareholder': return 'default' as const;
      case 'candidate': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Доступ до ринку акцій
        </CardTitle>
        <CardDescription>Керування доступом користувачів до внутрішнього ринку акцій. Адміністратори і засновники завжди мають доступ.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'candidate', 'shareholder', 'none'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Усі' : f === 'candidate' ? 'Кандидати' : f === 'shareholder' ? 'Акціонери' : 'Без доступу'}
            </Button>
          ))}
        </div>

        {loadingAccess ? (
          <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Немає користувачів у цій категорії</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Користувач</TableHead>
                  <TableHead>Акції</TableHead>
                  <TableHead>Статус доступу</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate max-w-[150px]">{u.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.shares}</TableCell>
                    <TableCell>
                      <Badge variant={accessBadgeVariant(u.accessRole)}>{accessLabel(u.accessRole)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {u.accessRole !== 'candidate' && u.shares === 0 && (
                          <Button size="sm" variant="outline" onClick={() => setAccess(u.id, 'candidate')}>
                            <UserPlus className="h-3 w-3 mr-1" /> Кандидат
                          </Button>
                        )}
                        {u.accessRole !== 'shareholder' && (
                          <Button size="sm" variant="outline" onClick={() => setAccess(u.id, 'shareholder')}>
                            <Shield className="h-3 w-3 mr-1" /> Акціонер
                          </Button>
                        )}
                        {u.accessRole !== 'none' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={u.shares > 0}
                            title={u.shares > 0 ? 'Не можна забрати доступ у користувача, який володіє акціями' : undefined}
                            onClick={() => setAccess(u.id, 'none')}
                          >
                            <UserMinus className="h-3 w-3 mr-1" /> Зняти
                          </Button>
                        )}
                        {u.shares > 0 && u.accessRole !== 'none' && (
                          <span className="text-xs text-muted-foreground ml-1 self-center">🔒 має акції</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
      remaining_qty: count,
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
            <Button onClick={handleCreateProposal}>Створити пропозицію</Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Активні пропозиції</CardTitle>
          <CardDescription>Пропозиції на передачу акцій між акціонерами</CardDescription>
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
          <CardTitle>Заявки на передачу акцій</CardTitle>
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
              <div className="text-center py-8 text-muted-foreground">Немає заявок, що очікують розгляду</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Candidate / Access Management */}
      <StockMarketAccessManager />

      {/* Transaction Details Dialog */}
      <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
        <DialogContent className="max-w-2xl">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle>Деталі заявки на передачу акцій</DialogTitle>
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
                    <h3 className="text-sm font-medium">Кількість акцій</h3>
                    <p>{selectedTransaction.quantity}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Орієнт. вартість за акцію</h3>
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
                    Підтвердження означає, що реальна офлайн-передача акцій вже відбулась. 
                    Після підтвердження акції будуть перерозподілені в системі.
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
