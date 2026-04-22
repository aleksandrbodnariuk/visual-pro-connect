import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OrderType } from "@/components/specialist/types";

export type VipExpenseOrder = {
  id: string;
  title: string;
  order_date: string;
  order_type: OrderType;
  order_amount: number;
  order_expenses: number;
  status: string;
};

export function useVipExpenseAnalytics(userId: string | undefined) {
  const [orders, setOrders] = useState<VipExpenseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("specialist_orders")
      .select("id, title, order_date, order_type, order_amount, order_expenses, status")
      .eq("created_by", userId)
      .eq("status", "confirmed")
      .not("order_amount", "is", null)
      .order("order_date", { ascending: false });

    if (!error && data) {
      setOrders(
        data.map((item: any) => ({
          id: item.id,
          title: item.title,
          order_date: item.order_date,
          order_type: item.order_type,
          order_amount: Number(item.order_amount ?? 0),
          order_expenses: Number(item.order_expenses ?? 0),
          status: item.status,
        })) as VipExpenseOrder[]
      );
    } else if (error) {
      setOrders([]);
      console.error("useVipExpenseAnalytics: failed to fetch orders", error);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`vip-expense-analytics-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "specialist_orders",
          filter: `created_by=eq.${userId}`,
        },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, userId]);

  return { orders, loading, refetch: fetchOrders };
}