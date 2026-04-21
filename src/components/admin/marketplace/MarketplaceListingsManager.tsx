import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Trash2, Crown, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CURRENCY_SYMBOLS, STATUS_LABELS, type MarketplaceListingStatus } from "@/hooks/marketplace/types";
import { formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";

interface AdminListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: MarketplaceListingStatus;
  user_id: string;
  category_id: string;
  is_vip_boost: boolean;
  views_count: number;
  cover_image_url: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export function MarketplaceListingsManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["admin_marketplace_listings", statusFilter],
    queryFn: async (): Promise<AdminListing[]> => {
      let query = (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as AdminListing[];
      if (rows.length === 0) return [];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = await supabase.rpc("get_safe_public_profiles_by_ids", { _ids: userIds });
      const map = new Map((profiles || []).map((p: any) => [p.id, p]));
      return rows.map((r) => {
        const p = map.get(r.user_id) as any;
        return { ...r, user_name: p?.full_name || "Невідомий", user_avatar: p?.avatar_url || "" };
      });
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("marketplace_listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Оголошення видалено");
      qc.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
    },
    onError: (e: any) => toast.error(e.message || "Помилка"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("marketplace_listings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Статус оновлено");
      qc.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
    },
    onError: (e: any) => toast.error(e.message || "Помилка"),
  });

  const toggleVipBoost = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await (supabase as any).from("marketplace_listings").update({ is_vip_boost: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("VIP-просування оновлено");
      qc.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
    },
    onError: (e: any) => toast.error(e.message || "Помилка"),
  });

  const filtered = (listings || []).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.title.toLowerCase().includes(q) || l.user_name?.toLowerCase().includes(q);
  });

  const statusVariant = (s: string) => {
    switch (s) {
      case "active": return "default";
      case "reserved": return "secondary";
      case "sold": return "outline";
      case "archived": return "outline";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Оголошення маркетплейсу</CardTitle>
        <CardDescription>Модерація: видалення порушень, керування статусом і VIP-бустом</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Пошук за назвою або автором..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі статуси</SelectItem>
              <SelectItem value="active">Активні</SelectItem>
              <SelectItem value="reserved">Зарезервовані</SelectItem>
              <SelectItem value="sold">Продані</SelectItem>
              <SelectItem value="archived">Архів</SelectItem>
              <SelectItem value="draft">Чернетки</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Завантаження...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Оголошення не знайдено</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((l) => (
              <div key={l.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50">
                <div className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                  {l.cover_image_url ? (
                    <img src={l.cover_image_url} alt={l.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">—</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{l.title}</span>
                    {l.is_vip_boost && (
                      <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                        <Crown className="h-3 w-3" /> VIP
                      </Badge>
                    )}
                    <Badge variant={statusVariant(l.status) as any}>{STATUS_LABELS[l.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {Number(l.price).toLocaleString("uk-UA")} {CURRENCY_SYMBOLS[l.currency as keyof typeof CURRENCY_SYMBOLS] || l.currency}
                    </span>
                    <span>•</span>
                    <span>{l.user_name}</span>
                    <span>•</span>
                    <span>👁 {l.views_count}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: uk })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button asChild size="sm" variant="ghost" title="Переглянути">
                    <Link to={`/market/${l.id}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={l.is_vip_boost ? "text-amber-500" : ""}
                    onClick={() => toggleVipBoost.mutate({ id: l.id, value: !l.is_vip_boost })}
                    title={l.is_vip_boost ? "Зняти VIP" : "Дати VIP"}
                  >
                    <Crown className="h-4 w-4" />
                  </Button>
                  <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v })}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активне</SelectItem>
                      <SelectItem value="reserved">Зарезервоване</SelectItem>
                      <SelectItem value="sold">Продано</SelectItem>
                      <SelectItem value="archived">Архів</SelectItem>
                      <SelectItem value="draft">Чернетка</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Видалити «${l.title}»?`)) deleteListing.mutate(l.id);
                    }}
                    title="Видалити"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}