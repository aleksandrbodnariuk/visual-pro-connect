import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, CalendarPlus, Loader2 } from 'lucide-react';
import { InviteFriendDialog } from '@/components/representative/InviteFriendDialog';
import { InvitesList } from '@/components/representative/InvitesList';
import { TeamTree } from '@/components/representative/TeamTree';
import { RepBookingCalendar } from '@/components/representative/RepBookingCalendar';
import { CreateBookingDialog } from '@/components/representative/CreateBookingDialog';
import { EarningsBlock } from '@/components/representative/EarningsBlock';
import { ServiceCalculator } from '@/components/representative/ServiceCalculator';
import { PortfolioBlock } from '@/components/representative/PortfolioBlock';
import { ShareInviteBlock } from '@/components/representative/ShareInviteBlock';

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
        .select('id, title, order_date, status, description')
        .eq('representative_id', repRecord.id)
        .order('order_date', { ascending: true });

      if (error) throw error;
      setBookings((data || []) as Booking[]);
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
        <div className="min-h-screen flex items-center justify-center pt-16">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Доступ обмежено</h2>
              <p className="text-sm text-muted-foreground">
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
      <div className="min-h-screen pt-16 sm:pt-20 pb-20 px-3 sm:px-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Кабінет представника</h1>
            {repRecord && (
              <Badge variant="secondary" className="mt-1">
                {ROLE_LABELS[repRecord.role] || repRecord.role}
              </Badge>
            )}
          </div>
          {repRecord && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => navigate('/services')} size="sm" variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Каталог
              </Button>
              <Button onClick={() => setBookingOpen(true)} size="sm" variant="outline">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Бронювання
              </Button>
              <Button onClick={() => setInviteOpen(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Залучити
              </Button>
            </div>
          )}
        </div>

        {!repRecord && (
          <InvitesList userId={user!.id} onAccepted={loadRepresentative} />
        )}

        {repRecord && (
          <div className="space-y-6">
            {/* 1. Мій дохід */}
            <EarningsBlock representativeId={repRecord.id} />

            {/* 2. Моя команда */}
            <TeamTree representativeId={repRecord.id} />

            {/* 3. Календар */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Календар бронювань</CardTitle>
              </CardHeader>
              <CardContent>
                <RepBookingCalendar
                  bookings={bookings}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </CardContent>
            </Card>

            {/* 4. Калькулятор послуг */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  Калькулятор послуг
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/services')} variant="outline" className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Відкрити каталог послуг
                </Button>
              </CardContent>
            </Card>

            {/* 5. Портфоліо */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  Портфоліо фахівців
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/services?tab=portfolio')} variant="outline" className="w-full">
                  Переглянути роботи
                </Button>
              </CardContent>
            </Card>

            {/* 6. Запросити друга */}
            <InvitesList userId={user!.id} onAccepted={loadRepresentative} />
          </div>
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
