import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Users, UserPlus, CalendarPlus, Loader2, Settings, Archive, Trash2 } from 'lucide-react';
import { InviteFriendDialog } from '@/components/representative/InviteFriendDialog';
import { InvitesList } from '@/components/representative/InvitesList';
import { TeamTree } from '@/components/representative/TeamTree';
import { RepBookingCalendar } from '@/components/representative/RepBookingCalendar';
import { CreateBookingDialog } from '@/components/representative/CreateBookingDialog';
import { EarningsBlock } from '@/components/representative/EarningsBlock';
import { ServiceCalculator } from '@/components/representative/ServiceCalculator';
import { PortfolioBlock } from '@/components/representative/PortfolioBlock';
import { ShareInviteBlock } from '@/components/representative/ShareInviteBlock';
import { AnalyticsBlock } from '@/components/representative/AnalyticsBlock';
import { RepresentativePayouts } from '@/components/representative/RepresentativePayouts';
import { Card as UICard, CardHeader, CardTitle, CardContent as UICardContent } from '@/components/ui/card';

interface RepresentativeRecord {
  id: string;
  user_id: string;
  role: string;
  parent_id: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  title: string;
  order_date: string;
  status: string;
  description: string | null;
  isOwn?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  representative: 'Представник',
  manager: 'Менеджер',
  director: 'Директор',
};

export default function RepresentativePanel() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [repRecord, setRepRecord] = useState<RepresentativeRecord | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const loadRepresentative = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('representatives')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRepRecord(data as RepresentativeRecord);
        setHasAccess(true);
      } else {
        const { data: invites } = await supabase
          .from('representative_invites')
          .select('*')
          .eq('invited_user_id', user.id)
          .eq('status', 'pending');

        if (invites && invites.length > 0) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      }
    } catch (err) {
      console.error('Error loading representative data:', err);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadBookings = useCallback(async () => {
    if (!repRecord) return;
    try {
      const { data, error } = await supabase
        .from('specialist_orders')
        .select('id, title, order_date, status, description, representative_id')
        .in('status', ['pending', 'confirmed'])
        .order('order_date', { ascending: true });

      if (error) throw error;
      setBookings((data || []).map((b: any) => ({
        ...b,
        isOwn: b.representative_id === repRecord.id,
      })) as Booking[]);
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  }, [repRecord]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) loadRepresentative();
  }, [user, authLoading, navigate, loadRepresentative]);

  useEffect(() => {
    if (repRecord) loadBookings();
  }, [repRecord, loadBookings]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (hasAccess === false) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16 px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Доступ обмежено</h2>
              <p className="text-sm text-muted-foreground break-words">
                Ви не є представником. Зверніться до вашого менеджера або директора для отримання запрошення.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-16 sm:pt-20 pb-24 px-3 sm:px-4 md:px-6 max-w-5xl mx-auto scroll-smooth">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Кабінет представника</h1>
            {repRecord && (
              <Badge variant="secondary" className="mt-1">
                {ROLE_LABELS[repRecord.role] || repRecord.role}
              </Badge>
            )}
          </div>
          {repRecord && (
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={() => setBookingOpen(true)}
                size="sm"
                variant="outline"
                className="min-h-[44px] min-w-[44px] text-xs sm:text-sm"
              >
                <CalendarPlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Бронювання</span>
              </Button>
              <Button
                onClick={() => setInviteOpen(true)}
                size="sm"
                className="min-h-[44px] min-w-[44px] text-xs sm:text-sm"
              >
                <UserPlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Залучити</span>
              </Button>
            </div>
          )}
        </div>

        {!repRecord && (
          <InvitesList userId={user!.id} onAccepted={loadRepresentative} />
        )}

        {repRecord && (
          <Tabs defaultValue="cabinet" className="w-full">
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="cabinet">Кабінет</TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-4 w-4" />
                Налаштування
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cabinet">
              <div className="space-y-4 sm:space-y-6">
                <UICard>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Календар бронювань</CardTitle>
                  </CardHeader>
                  <UICardContent>
                    <div className="overflow-x-auto -mx-2 px-2">
                      <RepBookingCalendar
                        bookings={bookings}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                      />
                    </div>
                  </UICardContent>
                </UICard>

                <ServiceCalculator />
                <PortfolioBlock />
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-4 sm:space-y-6">
                <RepresentativePayouts userId={user!.id} />
                <TeamTree representativeId={repRecord.id} />
                <EarningsBlock representativeId={repRecord.id} />

                <ShareInviteBlock
                  representativeId={repRecord.id}
                  onInviteDialogOpen={() => setInviteOpen(true)}
                />
                <InvitesList userId={user!.id} onAccepted={loadRepresentative} />

                <AnalyticsBlock />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {repRecord && (
        <>
          <InviteFriendDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            representativeId={repRecord.id}
            onInviteSent={loadRepresentative}
          />
          <CreateBookingDialog
            open={bookingOpen}
            onOpenChange={setBookingOpen}
            representativeId={repRecord.id}
            userId={user!.id}
            initialDate={selectedDate}
            onCreated={loadBookings}
          />
        </>
      )}
    </>
  );
}
