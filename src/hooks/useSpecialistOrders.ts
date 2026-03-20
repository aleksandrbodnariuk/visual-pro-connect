
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SpecialistOrder, OrderParticipant, OrderStatus } from '@/components/specialist/types';
import { toast } from '@/components/ui/use-toast';

export function useSpecialistOrders(statusFilter: OrderStatus) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SpecialistOrder[]>([]);
  const [participants, setParticipants] = useState<Record<string, OrderParticipant[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('specialist_orders')
        .select('*')
        .eq('status', statusFilter)
        .order('order_date', { ascending: true });

      if (error) throw error;
      setOrders((data || []) as SpecialistOrder[]);

      // Fetch participants for all orders
      if (data && data.length > 0) {
        const orderIds = data.map((o: any) => o.id);
        const { data: pData } = await (supabase as any)
          .from('specialist_order_participants')
          .select('*')
          .in('order_id', orderIds);

        const grouped: Record<string, OrderParticipant[]> = {};
        (pData || []).forEach((p: OrderParticipant) => {
          if (!grouped[p.order_id]) grouped[p.order_id] = [];
          grouped[p.order_id].push(p);
        });
        setParticipants(grouped);
      } else {
        setParticipants({});
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('specialist-orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'specialist_orders',
      }, () => {
        fetchOrders();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'specialist_order_participants',
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  const createOrder = useCallback(async (order: {
    title: string;
    description?: string;
    order_type: string;
    order_date: string;
    notes?: string;
    representative_id?: string;
  }) => {
    if (!user) return;
    const insertData: any = { ...order, created_by: user.id, status: 'pending' };
    if (!insertData.representative_id) delete insertData.representative_id;

    const { data, error } = await (supabase as any)
      .from('specialist_orders')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return null;
    }

    // Add creator as participant
    await (supabase as any)
      .from('specialist_order_participants')
      .insert({ order_id: data.id, specialist_id: user.id, role: order.order_type });

    toast({ title: 'Бронювання створено' });
    return data;
  }, [user]);

  const updateOrder = useCallback(async (id: string, updates: Partial<SpecialistOrder>) => {
    const { error } = await (supabase as any)
      .from('specialist_orders')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Замовлення оновлено' });
    return true;
  }, []);

  const addParticipant = useCallback(async (orderId: string, specialistId: string, role: string) => {
    const { error } = await (supabase as any)
      .from('specialist_order_participants')
      .upsert(
        { order_id: orderId, specialist_id: specialistId, role },
        { onConflict: 'order_id,specialist_id' }
      );

    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }, []);

  const removeParticipant = useCallback(async (participantId: string) => {
    const { error } = await (supabase as any)
      .from('specialist_order_participants')
      .delete()
      .eq('id', participantId);

    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }, []);

  return {
    orders,
    participants,
    loading,
    fetchOrders,
    createOrder,
    updateOrder,
    addParticipant,
    removeParticipant,
  };
}
