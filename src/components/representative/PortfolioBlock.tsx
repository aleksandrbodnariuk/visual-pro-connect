import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Video, Music, ImageIcon, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PortfolioCollection } from '@/components/profile/PortfolioCollection';
import { PortfolioMusicProvider } from '@/components/profile/PortfolioMusic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  OTHER_CATEGORY_LABEL,
  OtherCategoryIcon,
} from '@/lib/portfolioCategories';
import { usePortfolioCategories } from '@/hooks/usePortfolioCategories';

function parseVideoUrl(url: string) {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\s?/]+)/);
  if (ytMatch) {
    return {
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`,
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      thumbnail: `https://vumbnail.com/${vimeoMatch[1]}.jpg`,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
    };
  }
  return null;
}

interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_preview_url: string | null;
  media_display_url: string | null;
  media_type: string;
  category: string | null;
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
  const { categories: portfolioCategories } = usePortfolioCategories();
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [playingVideo, setPlayingVideo] = useState<{ embedUrl: string; title: string } | null>(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('portfolio')
          .select('id, user_id, title, description, media_url, media_preview_url, media_display_url, media_type, category')
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

  const photoItems = useMemo(
    () => filtered.filter(i => i.media_type === 'photo'),
    [filtered]
  );

  // Group items by category in stable order
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: PortfolioItem[] }>();
    portfolioCategories.forEach((c) =>
      groups.set(c.key, { key: c.key, label: c.label, items: [] })
    );
    groups.set('__other', { key: '__other', label: OTHER_CATEGORY_LABEL, items: [] });
    filtered.forEach((item) => {
      const key = item.category && groups.has(item.category) ? item.category : '__other';
      groups.get(key)?.items.push(item);
    });
    return Array.from(groups.values()).filter((g) => g.items.length > 0);
  }, [filtered, portfolioCategories]);

  const handlePrevPhoto = useCallback(() => {
    setViewingPhotoIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev);
  }, []);

  const handleNextPhoto = useCallback(() => {
    setViewingPhotoIndex(prev => prev !== null && prev < photoItems.length - 1 ? prev + 1 : prev);
  }, [photoItems.length]);

  useEffect(() => {
    if (viewingPhotoIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      else if (e.key === 'ArrowRight') handleNextPhoto();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewingPhotoIndex, handlePrevPhoto, handleNextPhoto]);

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
      <PortfolioMusicProvider>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          Портфоліо фахівців
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto -mx-3 px-3 pb-1">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button variant="outline"
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
              </Button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Немає робіт у цій категорії
          </p>
        ) : (
          <div className="space-y-6">
            {groupedItems.map((group) => {
              const GroupIcon =
                portfolioCategories.find((c) => c.key === group.key)?.icon ?? OtherCategoryIcon;
              return (
                <section key={group.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">{group.label}</h4>
                    <span className="text-xs text-muted-foreground">({group.items.length})</span>
                  </div>
                  <PortfolioCollection category={group.label} items={group.items.map(item => ({
                    id: item.id, type: item.media_type, title: item.title, url: item.media_url,
                    coverUrl: item.media_preview_url || item.media_display_url, description: item.description,
                    authorId: item.user_id, authorName: profiles.get(item.user_id)?.full_name,
                    authorAvatar: profiles.get(item.user_id)?.avatar_url,
                    thumbnailUrl: item.media_type === 'video' ? parseVideoUrl(item.media_url)?.thumbnail : (item.media_preview_url || item.media_display_url || item.media_url),
                  }))} onOpen={id => {
                    const item = group.items.find(item => item.id === id);
                    if (!item) return;
                    if (item.media_type === 'video') {
                      const video = parseVideoUrl(item.media_url);
                      if (video) setPlayingVideo({ embedUrl: video.embedUrl, title: item.title });
                    } else setViewingPhotoIndex(photoItems.findIndex(photo => photo.id === id));
                  }} />
                </section>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Photo lightbox */}
      <Dialog open={viewingPhotoIndex !== null} onOpenChange={() => setViewingPhotoIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          {viewingPhotoIndex !== null && photoItems[viewingPhotoIndex] && (
            <div className="relative flex items-center justify-center min-h-[50vh] max-h-[85vh] p-4">
              {viewingPhotoIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
              )}
              <img
                src={photoItems[viewingPhotoIndex].media_display_url || photoItems[viewingPhotoIndex].media_url}
                alt={photoItems[viewingPhotoIndex].title}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
              {viewingPhotoIndex < photoItems.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                {viewingPhotoIndex + 1} / {photoItems.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video player */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {playingVideo && (
            <div className="aspect-video w-full">
              <iframe
                src={playingVideo.embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={playingVideo.title}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      </PortfolioMusicProvider>
    </Card>
  );
}
