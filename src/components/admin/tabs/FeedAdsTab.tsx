import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { UserPicker, useProfiles } from '@/components/party/UserPicker';
import { AdsList } from '@/components/ads/AdsList';
import { SponsoredPostCard } from '@/components/ads/SponsoredPostCard';
import type { FeedAd } from '@/lib/feedAds';
import { toast } from 'sonner';

export function FeedAdsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const profiles = useProfiles();
  const [preview, setPreview] = useState<FeedAd | null>(null);
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name || 'Користувач';

  const { data: managers = [] } = useQuery({
    queryKey: ['ad-managers'],
    queryFn: async () => ((await (supabase as any).from('ad_managers').select('user_id, created_at')).data || []) as { user_id: string }[],
  });
  const { data: ads = [] } = useQuery({
    queryKey: ['admin-feed-ads'],
    queryFn: async () => ((await (supabase as any).from('feed_ads').select('*').order('created_at', { ascending: false }).limit(200)).data || []) as FeedAd[],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['ad-managers'] }); qc.invalidateQueries({ queryKey: ['admin-feed-ads'] }); qc.invalidateQueries({ queryKey: ['feed-ads-active'] }); };

  const grant = async (id: string) => {
    const { error } = await (supabase as any).from('ad_managers').insert({ user_id: id, granted_by: user!.id });
    if (error) toast.error('Не вдалося надати права'); else { toast.success('Рекламні права надано'); refresh(); }
  };
  const revoke = async (id: string) => {
    const { error } = await (supabase as any).from('ad_managers').delete().eq('user_id', id);
    if (error) toast.error('Не вдалося відкликати права'); else refresh();
  };
  const review = async (ad: FeedAd, approve: boolean) => {
    let reason: string | null = null;
    if (!approve) { reason = prompt('Причина відхилення (її побачить автор):') || ''; if (!reason.trim()) return; }
    const { error } = await (supabase as any).from('feed_ads').update({
      status: approve ? 'active' : 'rejected', rejection_reason: reason, reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    }).eq('id', ad.id);
    if (error) toast.error('Не вдалося зберегти рішення'); else { toast.success(approve ? 'Рекламу схвалено' : 'Рекламу відхилено'); setPreview(null); refresh(); }
  };
  const setStatus = async (ad: FeedAd, status: string) => {
    const { error } = await (supabase as any).from('feed_ads').update({ status }).eq('id', ad.id);
    if (error) toast.error('Не вдалося змінити статус'); else refresh();
  };

  const pending = ads.filter((a) => a.status === 'pending_approval');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="moderation">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="moderation">На перевірці ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">Уся реклама</TabsTrigger>
          <TabsTrigger value="managers">Рекламні права ({managers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="moderation" className="space-y-4">
          {preview && (
            <Card><CardHeader><CardTitle className="text-base">Попередній перегляд</CardTitle></CardHeader>
              <CardContent className="max-w-xl"><SponsoredPostCard preview ad={preview} /></CardContent></Card>
          )}
          <AdsList ads={pending} empty="Немає реклами, що очікує перевірки" actions={(ad) => (
            <>
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => setPreview(ad)}>Переглянути</Button>
              <Button size="sm" className="min-h-11" onClick={() => review(ad, true)}>Схвалити</Button>
              <Button size="sm" variant="destructive" className="min-h-11" onClick={() => review(ad, false)}>Відхилити</Button>
            </>
          )} />
        </TabsContent>
        <TabsContent value="all">
          <AdsList ads={ads} empty="Реклами ще немає" actions={(ad) => (
            <>
              <span className="self-center text-xs text-muted-foreground">Автор: {nameOf(ad.author_id)}</span>
              {ad.status === 'active' && <Button size="sm" variant="outline" className="min-h-11" onClick={() => setStatus(ad, 'paused')}>Зупинити</Button>}
              {ad.status === 'pending_approval' && <Button size="sm" className="min-h-11" onClick={() => review(ad, true)}>Схвалити</Button>}
            </>
          )} />
        </TabsContent>
        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Надати рекламні права</CardTitle></CardHeader>
            <CardContent><UserPicker actionLabel="Надати" exclude={managers.map((m) => m.user_id)} onPick={(p) => grant(p.id)} /></CardContent>
          </Card>
          <div className="space-y-2">
            {managers.length === 0 && <p className="text-sm text-muted-foreground">Поки нікому не надано рекламних прав. Адміністратори мають їх автоматично.</p>}
            {managers.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <span className="truncate">{nameOf(m.user_id)}</span>
                <Button size="sm" variant="outline" className="min-h-11" onClick={() => revoke(m.user_id)}>Відкликати</Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
