
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, CheckCircle, Archive } from 'lucide-react';
import { SpecialistCalendar } from '@/components/specialist/SpecialistCalendar';
import { OrderList } from '@/components/specialist/OrderList';
import { CreateOrderModal } from '@/components/specialist/CreateOrderModal';
import { OrderDetailsModal } from '@/components/specialist/OrderDetailsModal';
import { useSpecialistOrders } from '@/hooks/useSpecialistOrders';
import { SpecialistOrder, OrderStatus } from '@/components/specialist/types';

export default function SpecialistPanel() {
  const navigate = useNavigate();
  const { user, appUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderStatus>('pending');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<SpecialistOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const { orders, participants, loading, createOrder, updateOrder, addParticipant, removeParticipant } = useSpecialistOrders(activeTab);

  // Check access
  useEffect(() => {
    if (authLoading || !user) return;

    const checkAccess = async () => {
      const [specResult, adminResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'specialist' as any }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any }),
      ]);
      
      const isSpec = specResult.data === true;
      const isAdm = adminResult.data === true || appUser?.founder_admin === true;
      
      setIsAdmin(isAdm);
      setHasAccess(isSpec || isAdm);
    };
    checkAccess();
  }, [user, appUser, authLoading]);

  // Redirect if no access
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (hasAccess === false) { navigate('/'); return; }
  }, [user, hasAccess, authLoading, navigate]);

  const handleSelectOrder = (order: SpecialistOrder) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (authLoading || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-16 sm:pt-20 px-3 sm:px-4 pb-safe-nav">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg sm:text-2xl font-bold">Кабінет фахівця</h1>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> <span className="hidden xs:inline">Бронювання</span><span className="xs:hidden">Нове</span>
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
      </div>

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
        isAdmin={isAdmin}
      />
    </div>
  );
}
