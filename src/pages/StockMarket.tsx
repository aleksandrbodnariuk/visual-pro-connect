import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp,
  PieChart,
  AlertCircle,
  FileText,
  HandshakeIcon,
  History,
  ShieldCheck,
  XCircle,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { getTitleByPercent } from "@/lib/shareholderRules";

/* ────────────── Types ────────────── */

interface MarketListing {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_avatar?: string;
  quantity: number;
  remaining_qty: number;
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
  created_at: string;
}

interface TransferLog {
  id: string;
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  shares_qty: number;
  price_per_share_usd: number;
  total_amount_usd: number;
  confirmed_by: string | null;
  confirmed_by_name: string;
  created_at: string;
}

interface ShareholderInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  shares: number;
  percentage: string;
  title: string;
}

/* ────────────── Helpers ────────────── */

const statusLabel = (status: string) => {
  switch (status) {
    case "active": return "Активна";
    case "partially_filled": return "Частково виконана";
    case "closed": return "Закрита";
    case "pending": return "Очікує розгляду";
    case "approved": return "Підтверджено";
    case "completed": return "Завершено";
    case "rejected": return "Відхилено";
    case "cancelled": return "Скасовано";
    default: return status;
  }
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "approved":
    case "completed":
    case "closed": return "secondary" as const;
    case "partially_filled": return "outline" as const;
    case "rejected":
    case "cancelled": return "destructive" as const;
    default: return "outline" as const;
  }
};

async function fetchNamesMap(ids: string[]): Promise<Record<string, { name: string; avatar?: string }>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.rpc("get_safe_public_profiles_by_ids", { _ids: ids });
  const map: Record<string, { name: string; avatar?: string }> = {};
  (data || []).forEach((p: any) => {
    map[p.id] = { name: p.full_name || "Невідомий", avatar: p.avatar_url };
  });
  return map;
}

/* ────────────── Component ────────────── */

export default function StockMarket() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "market";
  const { getCurrentUser, isAuthenticated, loading } = useSupabaseAuth();
  const currentUser = getCurrentUser();
  const { sharePriceUsd, totalShares, loading: settingsLoading } = useCompanySettings();

  const [myShares, setMyShares] = useState(0);
  const [allListings, setAllListings] = useState<MarketListing[]>([]);
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  const [shareholders, setShareholders] = useState<ShareholderInfo[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Dialogs
  const [openBuyDialog, setOpenBuyDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<MarketListing | null>(null);
  const [buyAmount, setBuyAmount] = useState("1");

  const [openSellDialog, setOpenSellDialog] = useState(false);
  const [sellSharesCount, setSellSharesCount] = useState("1");
  const [sellNote, setSellNote] = useState("");

  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Archive & delete for transfer history
  const [archivedTransferIds, setArchivedTransferIds] = useState<Set<string>>(new Set());
  const [transferDeleteTarget, setTransferDeleteTarget] = useState<string | null>(null);

  const isAdmin = currentUser?.isAdmin || currentUser?.founder_admin;
  const isShareholder = currentUser?.isShareHolder;

  /* ── reserved shares in my active/partially_filled listings ── */
  const reservedShares = useMemo(() => {
    if (!currentUser?.id) return 0;
    return allListings
      .filter((l) => l.seller_id === currentUser.id && (l.status === "active" || l.status === "partially_filled"))
      .reduce((sum, l) => sum + l.remaining_qty, 0);
  }, [allListings, currentUser?.id]);

  const availableShares = Math.max(0, myShares - reservedShares);

  /* ── data loading ── */
  const loadMarketData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingData(true);
    try {
      // 1. My shares
      const { data: sharesData } = await supabase
        .from("shares")
        .select("quantity")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      setMyShares(sharesData?.quantity || 0);

      // 2. All listings (admin sees all, user sees active/partially_filled + own)
      const listingsQuery = isAdmin
        ? supabase.from("market").select("*").order("created_at", { ascending: false })
        : supabase
            .from("market")
            .select("*")
            .or(`status.in.(active,partially_filled),seller_id.eq.${currentUser.id}`)
            .order("created_at", { ascending: false });
      const { data: marketData } = await listingsQuery;

      const sellerIds = new Set<string>();
      (marketData || []).forEach((m: any) => { if (m.seller_id) sellerIds.add(m.seller_id); });
      const namesMap = await fetchNamesMap(Array.from(sellerIds));

      const formattedListings: MarketListing[] = (marketData || []).map((m: any) => ({
        id: m.id,
        seller_id: m.seller_id,
        seller_name: namesMap[m.seller_id]?.name || "Невідомий",
        seller_avatar: namesMap[m.seller_id]?.avatar,
        quantity: m.quantity,
        remaining_qty: m.remaining_qty ?? m.quantity,
        price_per_share: Number(m.price_per_share),
        status: m.status || "active",
        created_at: m.created_at,
        notes: m.notes,
      }));
      setAllListings(formattedListings);

      // 3. Transactions
      const txQuery = isAdmin
        ? supabase.from("transactions").select("*").order("created_at", { ascending: false })
        : supabase
            .from("transactions")
            .select("*")
            .or(`seller_id.eq.${currentUser.id},buyer_id.eq.${currentUser.id}`)
            .order("created_at", { ascending: false });
      const { data: txData } = await txQuery;

      const txUserIds = new Set<string>();
      (txData || []).forEach((t: any) => {
        if (t.seller_id) txUserIds.add(t.seller_id);
        if (t.buyer_id) txUserIds.add(t.buyer_id);
      });
      const txNamesMap = await fetchNamesMap(Array.from(txUserIds));

      const formattedTx: Transaction[] = (txData || []).map((t: any) => ({
        id: t.id,
        share_id: t.share_id,
        seller_id: t.seller_id,
        seller_name: txNamesMap[t.seller_id]?.name || "Невідомий",
        buyer_id: t.buyer_id,
        buyer_name: txNamesMap[t.buyer_id]?.name || "Невідомий",
        quantity: t.quantity,
        price_per_share: Number(t.price_per_share) || 0,
        total_price: Number(t.total_price),
        status: t.status || "pending",
        created_at: t.created_at,
      }));

      if (isAdmin) {
        setAllTransactions(formattedTx);
        setMyTransactions(formattedTx.filter(
          (t) => t.seller_id === currentUser.id || t.buyer_id === currentUser.id
        ));
      } else {
        setMyTransactions(formattedTx);
        setAllTransactions([]);
      }

      // 4. Transfer history
      const { data: logsData } = await supabase
        .from("share_transfer_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (logsData && logsData.length > 0) {
        const logUserIds = new Set<string>();
        logsData.forEach((l: any) => {
          logUserIds.add(l.from_user_id);
          logUserIds.add(l.to_user_id);
          if (l.confirmed_by) logUserIds.add(l.confirmed_by);
        });
        const logNames = await fetchNamesMap(Array.from(logUserIds));

        setTransferLogs(
          logsData.map((l: any) => ({
            id: l.id,
            from_user_id: l.from_user_id,
            from_name: logNames[l.from_user_id]?.name || "Невідомий",
            to_user_id: l.to_user_id,
            to_name: logNames[l.to_user_id]?.name || "Невідомий",
            shares_qty: l.shares_qty,
            price_per_share_usd: Number(l.price_per_share_usd),
            total_amount_usd: Number(l.total_amount_usd),
            confirmed_by: l.confirmed_by,
            confirmed_by_name: l.confirmed_by ? (logNames[l.confirmed_by]?.name || "Невідомий") : "",
            created_at: l.created_at,
          }))
        );
      } else {
        setTransferLogs([]);
      }

      // 5. Shareholders — BATCH load shares instead of N+1 queries
      const { data: allProfiles } = await supabase.rpc("get_safe_public_profiles");
      const shProfiles = (allProfiles || []).filter((p: any) => p.is_shareholder);
      
      // Collect all shareholder user_ids
      const shareholderIds = shProfiles.map((p: any) => p.id);
      
      // Single batch query for all shares
      const sharesByUserId: Record<string, number> = {};
      if (shareholderIds.length > 0) {
        const { data: allSharesData } = await supabase
          .from("shares")
          .select("user_id, quantity")
          .in("user_id", shareholderIds);
        
        (allSharesData || []).forEach((s: any) => {
          sharesByUserId[s.user_id] = s.quantity || 0;
        });
      }
      
      // Build shareholders list using the map (no additional queries)
      const shList: ShareholderInfo[] = shProfiles.map((p: any) => {
        const shares = sharesByUserId[p.id] || 0;
        const pct = totalShares > 0 ? (shares / totalShares) * 100 : 0;
        const title = getTitleByPercent(pct);
        return {
          id: p.id,
          name: p.full_name || "Невідомий",
          avatarUrl: p.avatar_url,
          shares,
          percentage: pct.toFixed(2),
          title: title?.title || "",
        };
      });
      setShareholders(shList);
    } catch (error) {
      console.error("Error loading market data:", error);
    } finally {
      setLoadingData(false);
    }
  }, [currentUser?.id, totalShares, isAdmin]);

  // Check access to stock market
  useEffect(() => {
    if (loading || !currentUser?.id) return;
    if (!isAuthenticated()) {
      toast.error("Необхідно увійти в систему");
      navigate("/auth");
      return;
    }
    // Admin/founder always has access
    if (isAdmin) {
      setHasAccess(true);
      return;
    }
    // Check via RPC
    supabase.rpc('has_stock_market_access', { _user_id: currentUser.id })
      .then(({ data }) => setHasAccess(data === true));
  }, [loading, currentUser?.id, isAdmin]);

  useEffect(() => {
    if (hasAccess === true && currentUser?.id) {
      loadMarketData();
    }
  }, [hasAccess, currentUser?.id, loadMarketData]);

  /* ── actions ── */

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
    if (isNaN(amount) || amount <= 0 || amount > selectedOffer.remaining_qty) {
      toast.error(`Введіть коректну кількість (1–${selectedOffer.remaining_qty})`);
      return;
    }
    const totalPrice = amount * selectedOffer.price_per_share;
    const { error } = await supabase.from("transactions").insert({
      share_id: selectedOffer.id,
      seller_id: selectedOffer.seller_id,
      buyer_id: currentUser.id,
      quantity: amount,
      price_per_share: selectedOffer.price_per_share,
      total_price: totalPrice,
      status: "pending",
    });
    if (error) {
      console.error("Error creating transaction:", error);
      toast.error("Не вдалося створити заявку");
      return;
    }
    // Do NOT change listing status — it stays active until admin approves
    setOpenBuyDialog(false);
    toast.success("Заявку подано. Очікуйте підтвердження адміністратором.");
    await loadMarketData();
  };

  const createProposal = async () => {
    if (!currentUser) return;
    const amount = parseInt(sellSharesCount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Введіть коректну кількість акцій");
      return;
    }
    if (amount > availableShares) {
      toast.error(
        `Доступно для виставлення: ${availableShares} акцій (з ${myShares}, ${reservedShares} зарезервовано)`
      );
      return;
    }
    // Use server-side RPC for overselling protection
    const { error } = await supabase.rpc("create_share_listing", {
      _quantity: amount,
      _note: sellNote.trim() || null,
    });
    if (error) {
      console.error("Error creating listing:", error);
      const msg = error.message || "";
      if (msg.includes("Недостатньо")) toast.error(msg);
      else if (msg.includes("акціонера")) toast.error("Необхідний статус акціонера");
      else toast.error("Не вдалося створити пропозицію");
      return;
    }
    setOpenSellDialog(false);
    setSellSharesCount("1");
    setSellNote("");
    toast.success("Пропозицію опубліковано");
    await loadMarketData();
  };

  const cancelListing = async (listingId: string) => {
    // Check for pending transactions on this listing
    const hasPendingTx = (isAdmin ? allTransactions : myTransactions).some(
      (t) => t.share_id === listingId && t.status === "pending"
    );
    if (hasPendingTx) {
      toast.error("Неможливо скасувати: є активні заявки на цю пропозицію");
      return;
    }
    const { error } = await supabase
      .from("market")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", listingId)
      .eq("seller_id", currentUser?.id || "");
    if (error) {
      toast.error("Не вдалося скасувати пропозицію");
      return;
    }
    toast.success("Пропозицію скасовано");
    await loadMarketData();
  };

  const cancelTransaction = async () => {
    if (!selectedTransaction || selectedTransaction.status !== "pending") {
      toast.error("Цю заявку не можна скасувати");
      return;
    }
    const { error } = await supabase.rpc("cancel_share_transaction", {
      _transaction_id: selectedTransaction.id,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("не знайдено")) toast.error("Заявку не знайдено");
      else if (msg.includes("pending")) toast.error("Тільки pending-заявку можна скасувати");
      else if (msg.includes("заборонено")) toast.error("Доступ заборонено");
      else toast.error("Не вдалося скасувати заявку");
      return;
    }
    setOpenDetailsDialog(false);
    toast.success("Заявку скасовано");
    window.dispatchEvent(new CustomEvent('notifications-updated'));
    await loadMarketData();
  };

  // Admin actions
  const approveTransaction = async (txId: string) => {
    try {
      const { error } = await supabase.rpc("approve_share_transaction", { _transaction_id: txId });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("Недостатньо")) toast.error("Недостатньо акцій у продавця");
        else if (msg.includes("оброблено") || msg.includes("змінено")) toast.error("Заявку вже оброблено");
        else if (msg.includes("залишилось")) toast.error(msg);
        else toast.error("Не вдалося підтвердити передачу");
        return;
      }
      toast.success("Передачу акцій підтверджено");
      setOpenDetailsDialog(false);
      await loadMarketData();
    } catch {
      toast.error("Помилка підтвердження");
    }
  };

  const rejectTransaction = async (txId: string) => {
    try {
      const { error } = await supabase.rpc("reject_share_transaction", { _transaction_id: txId });
      if (error) {
        toast.error("Не вдалося відхилити заявку");
        return;
      }
      toast.success("Заявку відхилено");
      setOpenDetailsDialog(false);
      await loadMarketData();
    } catch {
      toast.error("Помилка відхилення");
    }
  };

  /* ── derived data ── */
  const activeListings = allListings.filter(
    (l) => (l.status === "active" || l.status === "partially_filled") && l.seller_id !== currentUser?.id && l.remaining_qty > 0
  );
  const myOffers = allListings.filter((l) => l.seller_id === currentUser?.id);
  const pendingTx = allTransactions.filter((t) => t.status === "pending");
  const myPercentage = totalShares > 0 ? ((myShares / totalShares) * 100).toFixed(2) : "0.00";

  /* ── loading / guards ── */
  if (loading || settingsLoading || hasAccess === null) {
    return <div className="container py-16 text-center">Завантаження...</div>;
  }
  if (!isAuthenticated() || !currentUser) {
    return <div className="container py-16 text-center">Перенаправлення...</div>;
  }
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Доступ обмежено</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Доступ до ринку акцій мають лише кандидати в акціонери, акціонери та адміністратор.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>На головну</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container grid grid-cols-12 items-start gap-0 px-2 sm:px-3 md:px-4 py-6">
        <div className="hidden lg:block col-span-3 sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain scrollbar-hide">
          <Sidebar />
        </div>

        <main className="col-span-12 lg:col-span-9 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Ринок акцій</h1>
              <p className="text-muted-foreground">Перегляд та управління акціями компанії</p>
            </div>
            {isShareholder && myShares > 0 && (
              <Button onClick={() => { setSellSharesCount("1"); setSellNote(""); setOpenSellDialog(true); }}>
                <TrendingUp className="h-4 w-4 mr-2" /> Створити пропозицію
              </Button>
            )}
          </div>

          {/* Info Banner */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Передача акцій відбувається за офлайн-домовленістю сторін. Тут ви можете опублікувати пропозицію або подати заявку. Адміністратор підтверджує факт передачі.
              </p>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Ціна акції</p>
                <p className="text-lg font-bold">{sharePriceUsd.toFixed(2)} USD</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Усього акцій</p>
                <p className="text-lg font-bold">{totalShares}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Активні пропозиції</p>
                <p className="text-lg font-bold">{allListings.filter(l => l.status === 'active' || l.status === 'partially_filled').length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <PieChart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Мої акції</p>
                <p className="text-lg font-bold">{myShares} ({myPercentage}%)</p>
              </CardContent>
            </Card>
            {isShareholder && (
              <Card>
                <CardContent className="p-4 text-center">
                  <HandshakeIcon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Доступно для виставл.</p>
                  <p className="text-lg font-bold">{availableShares}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue={initialTab} className="w-full space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="market">Пропозиції</TabsTrigger>
              {isShareholder && <TabsTrigger value="my-offers">Мої пропозиції</TabsTrigger>}
              <TabsTrigger value="transactions">Мої заявки</TabsTrigger>
              {isAdmin && <TabsTrigger value="moderation">Модерація {pendingTx.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingTx.length}</Badge>}</TabsTrigger>}
              <TabsTrigger value="history">Історія</TabsTrigger>
              <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
            </TabsList>

            {/* ── Пропозиції ── */}
            <TabsContent value="market">
              <Card>
                <CardHeader>
                  <CardTitle>Пропозиції на передачу акцій</CardTitle>
                  <CardDescription>Перегляньте та подайте заявку на отримання</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : activeListings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Акціонер</th>
                            <th className="text-left p-2">Доступно</th>
                            <th className="text-left p-2">Початково</th>
                            <th className="text-right p-2">Ціна / акцію</th>
                            <th className="text-right p-2">Загалом</th>
                            <th className="text-left p-2">Статус</th>
                            <th className="text-left p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeListings.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={item.seller_avatar} />
                                  <AvatarFallback>{item.seller_name[0]}</AvatarFallback>
                                </Avatar>
                                {item.seller_name}
                              </td>
                              <td className="p-2 font-medium">{item.remaining_qty}</td>
                              <td className="p-2 text-muted-foreground">{item.quantity}</td>
                              <td className="p-2 text-right">{item.price_per_share.toFixed(2)} USD</td>
                              <td className="p-2 text-right">{(item.remaining_qty * item.price_per_share).toFixed(2)} USD</td>
                              <td className="p-2">
                                <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                              </td>
                              <td className="p-2">
                                <Button size="sm" onClick={() => handleRequestTransfer(item)}>
                                  <HandshakeIcon className="h-4 w-4 mr-1" /> Заявка
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
                      <h3 className="text-lg font-medium mb-1">Немає активних пропозицій</h3>
                      <p className="text-muted-foreground text-sm">Наразі ніхто не пропонує передачу акцій</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Мої пропозиції ── */}
            {isShareholder && (
              <TabsContent value="my-offers">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Мої пропозиції</CardTitle>
                      <CardDescription>Ваші пропозиції на передачу акцій</CardDescription>
                    </div>
                    {myShares > 0 && (
                      <Button onClick={() => { setSellSharesCount("1"); setSellNote(""); setOpenSellDialog(true); }}>
                        <TrendingUp className="h-4 w-4 mr-2" /> Створити пропозицію
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {myOffers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Дата</th>
                              <th className="text-left p-2">Початково</th>
                              <th className="text-left p-2">Залишок</th>
                              <th className="text-right p-2">Ціна / акцію</th>
                              <th className="text-left p-2">Статус</th>
                              <th className="text-left p-2">Примітка</th>
                              <th className="text-left p-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {myOffers.map((item) => (
                              <tr key={item.id} className="border-b hover:bg-muted/50">
                                <td className="p-2">{new Date(item.created_at).toLocaleDateString()}</td>
                                <td className="p-2">{item.quantity}</td>
                                <td className="p-2 font-medium">{item.remaining_qty}</td>
                                <td className="p-2 text-right">{item.price_per_share.toFixed(2)} USD</td>
                                <td className="p-2">
                                  <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                                </td>
                                <td className="p-2 text-muted-foreground text-xs max-w-[150px] truncate">{item.notes || "—"}</td>
                                <td className="p-2">
                                  {(item.status === "active" || item.status === "partially_filled") && (
                                    <Button size="sm" variant="destructive" onClick={() => cancelListing(item.id)}>
                                      <XCircle className="h-4 w-4 mr-1" /> Скасувати
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium mb-1">У вас немає пропозицій</h3>
                        <p className="text-muted-foreground text-sm">Створіть пропозицію за допомогою кнопки вище</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ── Мої заявки ── */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Мої заявки</CardTitle>
                  <CardDescription>Подані та отримані заявки на передачу акцій</CardDescription>
                </CardHeader>
                <CardContent>
                  {myTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Дата</th>
                            <th className="text-left p-2">Тип</th>
                            <th className="text-left p-2">Контрагент</th>
                            <th className="text-left p-2">Акцій</th>
                            <th className="text-right p-2">Сума</th>
                            <th className="text-left p-2">Статус</th>
                            <th className="text-left p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {myTransactions.map((tx) => (
                            <tr key={tx.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                              <td className="p-2">{tx.seller_id === currentUser.id ? "Передача" : "Отримання"}</td>
                              <td className="p-2">{tx.seller_id === currentUser.id ? tx.buyer_name : tx.seller_name}</td>
                              <td className="p-2">{tx.quantity}</td>
                              <td className="p-2 text-right">{tx.total_price.toFixed(2)} USD</td>
                              <td className="p-2">
                                <Badge variant={statusBadgeVariant(tx.status)}>{statusLabel(tx.status)}</Badge>
                              </td>
                              <td className="p-2">
                                <Button size="sm" variant="outline" onClick={() => { setSelectedTransaction(tx); setOpenDetailsDialog(true); }}>
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
                      <h3 className="text-lg font-medium mb-1">Немає заявок</h3>
                      <p className="text-muted-foreground text-sm">Ваші заявки з'являться тут</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Модерація (admin) ── */}
            {isAdmin && (
              <TabsContent value="moderation">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" /> Модерація заявок
                    </CardTitle>
                    <CardDescription>Заявки, що очікують підтвердження адміністратором</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingTx.length > 0 ? (
                      <div className="space-y-4">
                        {pendingTx.map((tx) => (
                          <Card key={tx.id} className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Від кого (продавець)</p>
                                <p className="font-medium">{tx.seller_name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Кому (покупець)</p>
                                <p className="font-medium">{tx.buyer_name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Кількість акцій</p>
                                <p className="font-medium">{tx.quantity}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Сума</p>
                                <p className="font-medium">{tx.total_price.toFixed(2)} USD</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Ціна за акцію</p>
                                <p className="font-medium">{tx.price_per_share.toFixed(2)} USD</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Дата заявки</p>
                                <p className="font-medium">{new Date(tx.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Підтвердження означає, що офлайн-передача вже відбулась. Акції будуть перерозподілені в системі.
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" onClick={() => rejectTransaction(tx.id)}>
                                <XCircle className="h-4 w-4 mr-1" /> Відхилити
                              </Button>
                              <Button size="sm" onClick={() => approveTransaction(tx.id)}>
                                <ShieldCheck className="h-4 w-4 mr-1" /> Підтвердити передачу
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium mb-1">Немає заявок для модерації</h3>
                        <p className="text-muted-foreground text-sm">Усі заявки оброблені</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ── Історія передач ── */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" /> Історія передач акцій
                      </CardTitle>
                      <CardDescription>Журнал усіх підтверджених передач</CardDescription>
                    </div>
                    {isAdmin && transferLogs.some(l => !archivedTransferIds.has(l.id)) && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const visibleIds = transferLogs.filter(l => !archivedTransferIds.has(l.id)).map(l => l.id);
                        setArchivedTransferIds(prev => {
                          const next = new Set(prev);
                          visibleIds.forEach(id => next.add(id));
                          return next;
                        });
                        toast.success("Усі записи переміщено в архів");
                      }}>
                        Архівувати все
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const visibleLogs = transferLogs.filter(l => !archivedTransferIds.has(l.id));
                    return visibleLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Дата</th>
                            <th className="text-left p-2">Від кого</th>
                            <th className="text-left p-2">Кому</th>
                            <th className="text-left p-2">Акцій</th>
                            <th className="text-right p-2">Ціна / акцію</th>
                            <th className="text-right p-2">Загалом</th>
                            <th className="text-left p-2">Підтвердив</th>
                            {isAdmin && <th className="text-left p-2"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {visibleLogs.map((log) => (
                            <tr key={log.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{new Date(log.created_at).toLocaleDateString()}</td>
                              <td className="p-2">{log.from_name}</td>
                              <td className="p-2">{log.to_name}</td>
                              <td className="p-2">{log.shares_qty}</td>
                              <td className="p-2 text-right">{log.price_per_share_usd.toFixed(2)} USD</td>
                              <td className="p-2 text-right">{log.total_amount_usd.toFixed(2)} USD</td>
                              <td className="p-2">{log.confirmed_by_name || "—"}</td>
                              {isAdmin && (
                                <td className="p-2">
                                  <Button size="sm" variant="ghost" onClick={() => {
                                    setArchivedTransferIds(prev => new Set(prev).add(log.id));
                                    toast.success("Переміщено в архів");
                                  }}>
                                    В архів
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-1">Немає записів</h3>
                      <p className="text-muted-foreground text-sm">Журнал передач поки порожній</p>
                    </div>
                  );
                  })()}

                  {/* Archived section */}
                  {isAdmin && archivedTransferIds.size > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Архів ({transferLogs.filter(l => archivedTransferIds.has(l.id)).length})</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm opacity-70">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Дата</th>
                              <th className="text-left p-2">Від кого</th>
                              <th className="text-left p-2">Кому</th>
                              <th className="text-left p-2">Акцій</th>
                              <th className="text-right p-2">Загалом</th>
                              <th className="text-left p-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {transferLogs.filter(l => archivedTransferIds.has(l.id)).map((log) => (
                              <tr key={log.id} className="border-b hover:bg-muted/50">
                                <td className="p-2">{new Date(log.created_at).toLocaleDateString()}</td>
                                <td className="p-2">{log.from_name}</td>
                                <td className="p-2">{log.to_name}</td>
                                <td className="p-2">{log.shares_qty}</td>
                                <td className="p-2 text-right">{log.total_amount_usd.toFixed(2)} USD</td>
                                <td className="p-2">
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => {
                                      setArchivedTransferIds(prev => {
                                        const next = new Set(prev);
                                        next.delete(log.id);
                                        return next;
                                      });
                                    }}>
                                      Повернути
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => {
                                      setTransferDeleteTarget(log.id);
                                    }}>
                                      Видалити
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Акціонери ── */}
            <TabsContent value="shareholders">
              <Card>
                <CardHeader>
                  <CardTitle>Акціонери</CardTitle>
                  <CardDescription>Інформація про акціонерів компанії</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Акціонер</th>
                          <th className="text-left p-2">Акцій</th>
                          <th className="text-left p-2">%</th>
                          <th className="text-left p-2">Титул</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shareholders.map((sh) => (
                          <tr key={sh.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={sh.avatarUrl} />
                                  <AvatarFallback>{sh.name[0]}</AvatarFallback>
                                </Avatar>
                                {sh.name}
                                {sh.id === currentUser.id && <span className="text-xs text-muted-foreground">(Ви)</span>}
                              </div>
                            </td>
                            <td className="p-2">{sh.shares}</td>
                            <td className="p-2">{sh.percentage}%</td>
                            <td className="p-2">{sh.title || "—"}</td>
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

      {/* ── Dialog: Buy Request ── */}
      <Dialog open={openBuyDialog} onOpenChange={setOpenBuyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Заявка на отримання акцій</DialogTitle>
            <DialogDescription>
              Передача відбудеться після офлайн-домовленості та підтвердження адміністратором.
            </DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4 py-2">
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Від кого:</span> {selectedOffer.seller_name}</p>
                <p><span className="font-medium">Доступно:</span> {selectedOffer.remaining_qty} акцій</p>
                <p><span className="font-medium">Ціна за акцію:</span> {selectedOffer.price_per_share.toFixed(2)} USD</p>
              </div>
              <div>
                <label className="text-sm font-medium">Кількість акцій:</label>
                <Input type="number" min="1" max={selectedOffer.remaining_qty} value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} />
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">Орієнтовна вартість:</p>
                <p className="text-2xl font-bold">{(parseInt(buyAmount) * selectedOffer.price_per_share || 0).toFixed(2)} USD</p>
                <p className="text-xs text-muted-foreground mt-1">Фактичні умови обговорюються офлайн</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBuyDialog(false)}>Скасувати</Button>
            <Button onClick={confirmTransferRequest}>Подати заявку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Transaction Details ── */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Деталі заявки</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Від кого:</p>
                  <p className="font-medium">{selectedTransaction.seller_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Кому:</p>
                  <p className="font-medium">{selectedTransaction.buyer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Акцій:</p>
                  <p className="font-medium">{selectedTransaction.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Сума:</p>
                  <p className="font-medium">{selectedTransaction.total_price.toFixed(2)} USD</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Статус:</p>
                <Badge variant={statusBadgeVariant(selectedTransaction.status)}>{statusLabel(selectedTransaction.status)}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                {selectedTransaction.status === "pending" && selectedTransaction.buyer_id === currentUser.id && (
                  <Button size="sm" variant="destructive" onClick={cancelTransaction}>Скасувати заявку</Button>
                )}
                {isAdmin && selectedTransaction.status === "pending" && (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => rejectTransaction(selectedTransaction.id)}>Відхилити</Button>
                    <Button size="sm" onClick={() => approveTransaction(selectedTransaction.id)}>Підтвердити передачу</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create Proposal ── */}
      <Dialog open={openSellDialog} onOpenChange={setOpenSellDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Створити пропозицію передачі</DialogTitle>
            <DialogDescription>
              Опублікуйте намір передати акції. Ціна визначається базовою вартістю компанії.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Ваших акцій:</span> {myShares}</p>
              <p><span className="font-medium">Зарезервовано:</span> {reservedShares}</p>
              <p><span className="font-medium">Доступно:</span> {availableShares}</p>
              <p><span className="font-medium">Ціна за акцію:</span> {sharePriceUsd.toFixed(2)} USD</p>
            </div>
            {availableShares > 0 ? (
              <>
                <div>
                  <label className="text-sm font-medium">Кількість акцій:</label>
                  <Input type="number" min="1" max={availableShares} value={sellSharesCount} onChange={(e) => setSellSharesCount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Примітка (необов'язково):</label>
                  <Textarea value={sellNote} onChange={(e) => setSellNote(e.target.value)} placeholder="Коментар до пропозиції..." maxLength={500} className="mt-1" />
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground">Орієнтовна загальна вартість:</p>
                  <p className="text-2xl font-bold">{(parseInt(sellSharesCount) * sharePriceUsd || 0).toFixed(2)} USD</p>
                </div>
              </>
            ) : (
              <p className="text-destructive text-sm">Немає доступних акцій для виставлення</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSellDialog(false)}>Скасувати</Button>
            <Button onClick={createProposal} disabled={availableShares <= 0}>Опублікувати</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Delete Transfer Log ── */}
      <Dialog open={!!transferDeleteTarget} onOpenChange={() => setTransferDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити запис</DialogTitle>
            <DialogDescription>Ви впевнені, що хочете видалити цей запис з історії передач? Цю дію не можна скасувати.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDeleteTarget(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={async () => {
              if (!transferDeleteTarget) return;
              const { error } = await supabase.from("share_transfer_log").delete().eq("id", transferDeleteTarget);
              if (error) {
                toast.error("Не вдалося видалити запис");
                return;
              }
              setArchivedTransferIds(prev => {
                const next = new Set(prev);
                next.delete(transferDeleteTarget);
                return next;
              });
              setTransferLogs(prev => prev.filter(l => l.id !== transferDeleteTarget));
              setTransferDeleteTarget(null);
              toast.success("Запис видалено");
            }}>Видалити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
