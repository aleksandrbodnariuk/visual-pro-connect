import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsAdManager } from '@/hooks/ads/useFeedAds';
import { AdEditorDialog } from '@/components/ads/AdEditorDialog';
import { AdsList } from '@/components/ads/AdsList';
import { effectiveAdStatus, type FeedAd } from '@/lib/feedAds';
import { toast } from 'sonner';

export default function AdPanel() {
  const { user, loading } = useAuth();
  const { data: allowed, isLoading } = useIsAdManager();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FeedAd | null>(null);
  const [open, setOpen] = useState(false);

  const { data: ads = [] } = useQuery({
    queryKey: ['my-feed-ads', user?.id],
    enabled: !!user && allowed === true,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('feed_ads').select('*').eq('author_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeedAd[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-feed-ads'] });

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (isLoading || loading) return <div className="p-8 text-center text-muted-foreground">Завантаження…</div>;
  if (!allowed) return (
    <div className="min-h-screen pt-14 sm:pt-16 pb-safe-nav"><Navbar />
      <div className="container py-16 text-center text-muted-foreground">У вас немає доступу до панелі рекламного відділу. Зверніться до адміністратора.</div>
    </div>
  );

  const setStatus = async (ad: FeedAd, status: string) => {
    const { error } = await (supabase as any).from('feed_ads').update({ status }).eq('id', ad.id);
    if (error) toast.error('Не вдалося змінити статус'); else refresh();
  };
  const remove = async (ad: FeedAd) => {
    if (!confirm('Видалити рекламу назавжди?')) return;
    const { error } = await (supabase as any).from('feed_ads').delete().eq('id', ad.id);
    if (error) toast.error('Не вдалося видалити'); else refresh();
  };

  const groups = {
    live: ads.filter((a) => ['active', 'scheduled'].includes(effectiveAdStatus(a)) || a.status === 'paused'),
    review: ads.filter((a) => ['draft', 'pending_approval', 'rejected'].includes(a.status)),
    done: ads.filter((a) => effectiveAdStatus(a) === 'completed'),
  };
  const totals = ads.reduce((s, a) => ({ v: s.v + a.views_count, c: s.c + a.clicks_count }), { v: 0, c: 0 });

  const actions = (ad: FeedAd) => (
    <>
      <Button size="sm" variant="outline" className="min-h-11" onClick={() => { setEditing(ad); setOpen(true); }}>Редагувати</Button>
      {ad.status === 'active' && <Button size="sm" variant="outline" className="min-h-11" onClick={() => setStatus(ad, 'paused')}>Призупинити</Button>}
      {ad.status === 'paused' && <Button size="sm" className="min-h-11" onClick={() => setStatus(ad, 'active')}>Відновити</Button>}
      {['draft', 'rejected'].includes(ad.status) && <Button size="sm" className="min-h-11" onClick={() => setStatus(ad, 'pending_approval')}>На перевірку</Button>}
      <Button size="sm" variant="ghost" className="min-h-11 text-destructive" onClick={() => remove(ad)}>Видалити</Button>
    </>
  );

  return (
    <div className="min-h-screen pt-14 sm:pt-16 3xl:pt-20 pb-safe-nav">
      <Navbar />
      <main className="container max-w-5xl space-y-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Megaphone className="h-6 w-6 text-primary" /> Панель рекламного відділу</h1>
          <Button className="min-h-11" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Нова реклама</Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['Кампаній', ads.length], ['Покази', totals.v], ['Переходи', totals.c]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></div>
          ))}
        </div>
        <Tabs defaultValue="live">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="live">У показі ({groups.live.length})</TabsTrigger>
            <TabsTrigger value="review">Чернетки й перевірка ({groups.review.length})</TabsTrigger>
            <TabsTrigger value="done">Завершені ({groups.done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="live"><AdsList ads={groups.live} actions={actions} empty="Немає реклами в показі" /></TabsContent>
          <TabsContent value="review"><AdsList ads={groups.review} actions={actions} empty="Немає чернеток" /></TabsContent>
          <TabsContent value="done"><AdsList ads={groups.done} actions={actions} empty="Немає завершених кампаній" /></TabsContent>
        </Tabs>
      </main>
      <AdEditorDialog open={open} onOpenChange={setOpen} ad={editing} onSaved={refresh} />
    </div>
  );
}
