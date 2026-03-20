import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Video, Music, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
}

const FILTERS = [
  { key: 'all', label: 'Усі', icon: ImageIcon },
  { key: 'photo', label: 'Фото', icon: Camera },
  { key: 'video', label: 'Відео', icon: Video },
  { key: 'audio', label: 'Музика', icon: Music },
] as const;

const TYPE_ICON: Record<string, React.ElementType> = {
  photo: Camera,
  video: Video,
  audio: Music,
};

export function PortfolioBlock() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('portfolio')
          .select('id, user_id, title, description, media_url, media_type')
          .order('created_at', { ascending: false });

        if (error) throw error;
        const portfolio = data || [];
        setItems(portfolio);

        const userIds = [...new Set(portfolio.map((p) => p.user_id))];
        if (userIds.length > 0) {
          const { data: profs } = await supabase.rpc('get_safe_public_profiles_by_ids', {
            _ids: userIds,
          });
          const map = new Map<string, Profile>();
          (profs || []).forEach((p: any) => map.set(p.id, p));
          setProfiles(map);
        }
      } catch (err) {
        console.error('Error loading portfolio:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.media_type === filter)),
    [items, filter]
  );

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base sm:text-lg">Портфоліо фахівців</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          Портфоліо фахівців
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters — horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-3 px-3 pb-1">
          <div className="flex gap-2 min-w-max">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-colors whitespace-nowrap min-h-[44px]',
                  filter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted border-border'
                )}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Немає робіт у цій категорії
          </p>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((item) => {
              const profile = profiles.get(item.user_id);
              const Icon = TYPE_ICON[item.media_type] || Camera;
              return (
                <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted/30">
                  {item.media_type === 'photo' ? (
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                    <p className="text-white text-xs font-medium truncate">{item.title}</p>
                    {profile && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback className="text-[8px]">{(profile.full_name || '?')[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-white/70 text-[10px] truncate">{profile.full_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
