
import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, CheckCircle, Archive, Trash2 } from 'lucide-react';
import { SpecialistCalendar } from '@/components/specialist/SpecialistCalendar';
import { OrderList } from '@/components/specialist/OrderList';
import { CreateOrderModal } from '@/components/specialist/CreateOrderModal';
import { OrderDetailsModal } from '@/components/specialist/OrderDetailsModal';
import { SpecialistOrder, OrderStatus } from '@/components/specialist/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AdminOrdersTab() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderStatus>('pending');
  const [orders, setOrders] = useState<SpecialistOrder[]>([]);
  const [participants, setParticipants] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<SpecialistOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('specialist_orders')
        .select('*')
        .eq('status', activeTab)
        .order('order_date', { ascending: true });

      if (error) throw error;
      setOrders((data || []) as SpecialistOrder[]);

      if (data && data.length > 0) {
        const orderIds = data.map((o: any) => o.id);
        const { data: pData } = await (supabase as any)
          .from('specialist_order_participants')
          .select('*')
          .in('order_id', orderIds);

        const grouped: Record<string, any[]> = {};
        (pData || []).forEach((p: any) => {
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
  }, [user, activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('admin-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'specialist_orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'specialist_order_participants' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchOrders]);

  const createOrder = useCallback(async (order: {
    title: string; description?: string; order_type: string; order_date: string; notes?: string;
  }) => {
    if (!user) return null;
    const { data, error } = await (supabase as any)
      .from('specialist_orders')
      .insert({ ...order, created_by: user.id, status: 'pending' })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    await (supabase as any)
      .from('specialist_order_participants')
      .insert({ order_id: data.id, specialist_id: user.id, role: order.order_type });
    toast.success('Замовлення створено');
    return data;
  }, [user]);

  const updateOrder = useCallback(async (id: string, updates: Partial<SpecialistOrder>) => {
    const { error } = await (supabase as any).from('specialist_orders').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success('Замовлення оновлено');
    return true;
  }, []);

  const addParticipant = useCallback(async (orderId: string, specialistId: string, role: string) => {
    const { error } = await (supabase as any)
      .from('specialist_order_participants')
      .upsert({ order_id: orderId, specialist_id: specialistId, role }, { onConflict: 'order_id,specialist_id' });
    if (error) { toast.error(error.message); return false; }
    toast.success('Фахівця додано');
    return true;
  }, []);

  const removeParticipant = useCallback(async (participantId: string) => {
    const { error } = await (supabase as any).from('specialist_order_participants').delete().eq('id', participantId);
    if (error) { toast.error(error.message); return false; }
    return true;
  }, []);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    // Delete participants first
    await (supabase as any).from('specialist_order_participants').delete().eq('order_id', orderToDelete);
    const { error } = await (supabase as any).from('specialist_orders').delete().eq('id', orderToDelete);
    if (error) { toast.error(error.message); } else {
      toast.success('Замовлення видалено');
      if (selectedOrder?.id === orderToDelete) { setDetailsOpen(false); setSelectedOrder(null); }
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleSelectOrder = (order: SpecialistOrder) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Управління замовленнями</h2>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Нове замовлення
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as OrderStatus); setSelectedDate(undefined); }}>
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm">
            <CalendarDays className="h-3.5 w-3.5 hidden sm:block" /> Бронювання
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-1 text-xs sm:text-sm">
            <CheckCircle className="h-3.5 w-3.5 hidden sm:block" /> Підтверджені
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-1 text-xs sm:text-sm">
            <Archive className="h-3.5 w-3.5 hidden sm:block" /> Архів
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            <div>
              <SpecialistCalendar
                orders={orders}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {loading ? 'Завантаження...' : `${orders.length} замовлень`}
                </h3>
                {selectedDate && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)} className="text-xs">
                    Показати всі
                  </Button>
                )}
              </div>
              <OrderList
                orders={orders}
                selectedDate={selectedDate}
                onSelectOrder={handleSelectOrder}
                selectedOrderId={selectedOrder?.id}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateOrderModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createOrder}
        initialDate={selectedDate}
      />

      <OrderDetailsModal
        order={selectedOrder}
        participants={selectedOrder ? (participants[selectedOrder.id] || []) : []}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={updateOrder}
        onAddParticipant={addParticipant}
        onRemoveParticipant={removeParticipant}
        isAdmin={true}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити замовлення?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія незворотня. Замовлення та всі його учасники будуть видалені.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
