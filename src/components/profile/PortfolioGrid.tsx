import { Camera, Music, Video, Play, Heart, MessageCircle, MoreHorizontal, Edit, Trash2, Plus, X, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  PORTFOLIO_CATEGORIES,
  OTHER_CATEGORY_LABEL,
  OtherCategoryIcon,
  getCategoryLabel,
} from "@/lib/portfolioCategories";

interface PortfolioItem {
  id: string;
  type: "photo" | "video" | "audio";
  /** Lightweight URL for grid view (≤400px). Falls back to display/legacy. */
  thumbnailUrl: string;
  /** High-quality URL for lightbox view (≤1600px). Falls back to legacy. */
  displayUrl: string;
  title: string;
  likes: number;
  comments: number;
  category?: string | null;
}

interface PortfolioGridProps {
  items: PortfolioItem[];
  className?: string;
  userId?: string;
  isOwner?: boolean;
  onAddItem?: () => void;
}

interface PortfolioRecord {
  id: string;
  title: string;
  media_url: string;
  media_preview_url?: string | null;
  media_display_url?: string | null;
  media_type: string;
  category?: string | null;
}

function parseVideoUrl(url: string) {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\s?/]+)/);
  if (youtubeMatch) {
    return {
      type: 'youtube' as const,
      id: youtubeMatch[1],
      thumbnail: `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo' as const,
      id: vimeoMatch[1],
      thumbnail: '',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    };
  }
  return null;
}

const getLocalPortfolioRecords = (userId?: string): PortfolioRecord[] => {
  if (!userId) return [];

  try {
    return JSON.parse(localStorage.getItem(`portfolio_${userId}`) || "[]");
  } catch {
    return [];
  }
};

const mapPortfolioRecordToItem = (item: PortfolioRecord): PortfolioItem => {
  let mediaType: "photo" | "video" | "audio" = "photo";

  if (item.media_type === "video") mediaType = "video";
  else if (item.media_type === "audio") mediaType = "audio";

  // Preview = small/fast for grid; Display = high-quality for lightbox
  // Fallback chain: preview → display → legacy media_url
  const thumbnailUrl = item.media_preview_url || item.media_display_url || item.media_url;
  const displayUrl = item.media_display_url || item.media_url;

  return {
    id: item.id,
    type: mediaType,
    thumbnailUrl,
    displayUrl,
    title: item.title,
    likes: 0,
    comments: 0,
    category: item.category ?? null,
  };
};

const FILTERS = [
  { key: 'all', label: 'Усі', icon: ImageIcon },
  { key: 'photo', label: 'Фото', icon: Camera },
  { key: 'video', label: 'Відео', icon: Video },
  { key: 'audio', label: 'Музика', icon: Music },
] as const;

const PAGE_SIZE = 12;

export const PortfolioGrid = memo(({ items: initialItems, className, userId, isOwner = false, onAddItem }: PortfolioGridProps) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [playingItem, setPlayingItem] = useState<{ embedUrl: string; title: string } | null>(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ url: string; title: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredItems = useMemo(
    () => filter === 'all' ? portfolioItems : portfolioItems.filter(i => i.type === filter),
    [portfolioItems, filter]
  );

  const photoItems = useMemo(
    () => filteredItems.filter(i => i.type === 'photo'),
    [filteredItems]
  );

  // Group items by category in a stable order (defined categories first, "Інше" last)
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: PortfolioItem[] }>();
    PORTFOLIO_CATEGORIES.forEach((c) =>
      groups.set(c.key, { key: c.key, label: c.label, items: [] })
    );
    groups.set("__other", { key: "__other", label: OTHER_CATEGORY_LABEL, items: [] });

    filteredItems.forEach((item) => {
      const key = item.category && groups.has(item.category) ? item.category : "__other";
      groups.get(key)!.items.push(item);
    });

    return Array.from(groups.values()).filter((g) => g.items.length > 0);
  }, [filteredItems]);
  
  useEffect(() => {
    if (!userId) {
      setPortfolioItems(initialItems);
    }
  }, [initialItems, userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchInitialPortfolioItems = async () => {
      setLoading(true);
      const localItems = getLocalPortfolioRecords(userId);

      try {
        const { data, error } = await supabase
          .from('portfolio')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (error) throw error;

        const remoteItems = (data || []).map(mapPortfolioRecordToItem);
        // Local fallback items only shown if remote is empty (legacy data)
        const fallbackItems = remoteItems.length === 0
          ? localItems.map(mapPortfolioRecordToItem)
          : [];

        setPortfolioItems([...fallbackItems, ...remoteItems]);
        setHasMore(remoteItems.length === PAGE_SIZE);
      } catch (error) {
        console.error("Error fetching portfolio:", error);
        setPortfolioItems(localItems.map(mapPortfolioRecordToItem));
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPortfolioItems();
  }, [userId]);

  const loadMore = async () => {
    if (!userId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = portfolioItems.length;
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const more = (data || []).map(mapPortfolioRecordToItem);
      setPortfolioItems(prev => {
        const existing = new Set(prev.map(p => p.id));
        return [...prev, ...more.filter(p => !existing.has(p.id))];
      });
      setHasMore(more.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more portfolio items:', error);
    } finally {
      setLoadingMore(false);
    }
  };
  
  const handleEdit = (id: string) => {
    toast.info(`Редагування елементу ${id}`);
  };
  
  const handleDelete = (id: string) => {
    setPortfolioItems(portfolioItems.filter(item => item.id !== id));
    toast.success("Елемент портфоліо видалено");
  };

  const handlePlayVideo = (item: PortfolioItem) => {
    const videoData = parseVideoUrl(item.displayUrl);
    if (videoData) {
      setPlayingItem({ embedUrl: videoData.embedUrl, title: item.title });
    } else {
      window.open(item.displayUrl, '_blank');
    }
  };

  const handleClickPhoto = (item: PortfolioItem) => {
    const idx = photoItems.findIndex(p => p.id === item.id);
    setViewingPhotoIndex(idx >= 0 ? idx : 0);
  };

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

  const handlePlayAudio = (item: PortfolioItem) => {
    setPlayingAudio({ url: item.displayUrl, title: item.title });
  };

  if (loading) {
    return <div className="text-center py-8">Завантаження портфоліо...</div>;
  }

  if (portfolioItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">У портфоліо ще немає елементів</h3>
        {isOwner && (
          <>
            <p className="text-sm max-w-md mx-auto mb-6">
              Покажіть свої найкращі роботи потенційним клієнтам
            </p>
            <Button onClick={onAddItem} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Додати в портфоліо
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Filter buttons */}
      <div className="overflow-x-auto -mx-3 px-3 pb-1 mb-4">
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

      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Немає робіт у цій категорії
        </p>
      ) : (
      <div className="space-y-8">
        {groupedItems.map((group) => {
          const GroupIcon =
            PORTFOLIO_CATEGORIES.find((c) => c.key === group.key)?.icon ?? OtherCategoryIcon;
          return (
            <section key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <GroupIcon className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
                <span className="text-xs text-muted-foreground">({group.items.length})</span>
              </div>
              <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4", className)}>
                {group.items.map((item) => {
          const videoData = item.type === "video" ? parseVideoUrl(item.displayUrl) : null;
          const thumbnailSrc = videoData?.thumbnail || item.thumbnailUrl;
          const isVideo = item.type === "video";
          const isAudio = item.type === "audio";
          const isPhoto = item.type === "photo";

          return (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-lg cursor-pointer"
              onClick={() => {
                if (isVideo) handlePlayVideo(item);
                else if (isAudio) handlePlayAudio(item);
                else if (isPhoto) handleClickPhoto(item);
              }}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                {isAudio ? (
                  <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Music className="h-16 w-16 text-white" />
                  </div>
                ) : (
                  <img
                    src={thumbnailSrc}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              
              {/* Media type icon */}
              <div className="absolute left-2 top-2 rounded-full bg-black/70 p-1.5 text-white">
                {isPhoto && <Camera className="h-4 w-4" />}
                {isVideo && <Video className="h-4 w-4" />}
                {isAudio && <Music className="h-4 w-4" />}
              </div>
              
              {/* Play button for video/audio */}
              {(isVideo || isAudio) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/40 p-3 backdrop-blur-sm group-hover:bg-black/60 transition-colors">
                    <Play className="h-8 w-8 text-white" fill="white" />
                  </div>
                </div>
              )}
              
              {/* Owner actions */}
              {isOwner && (
                <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-full bg-black/70 p-1.5 text-white hover:bg-black/90">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(item.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Редагувати
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Видалити
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                <h3 className="text-sm font-medium text-white">{item.title}</h3>
              </div>
            </div>
          );
                })}
              </div>
            </section>
          );
        })}
      </div>
      )}

      {/* Load more (only for the "all" filter; filters operate on already loaded items) */}
      {hasMore && filter === 'all' && portfolioItems.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Завантаження...' : 'Показати ще'}
          </Button>
        </div>
      )}

      {/* Photo lightbox with navigation */}
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
                src={photoItems[viewingPhotoIndex].displayUrl}
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

      {/* Video player dialog */}
      <Dialog open={!!playingItem} onOpenChange={() => setPlayingItem(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {playingItem && (
            <div className="aspect-video w-full">
              <iframe
                src={playingItem.embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={playingItem.title}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audio player dialog */}
      <Dialog open={!!playingAudio} onOpenChange={(open) => {
        if (!open) {
          audioRef.current?.pause();
          setPlayingAudio(null);
        }
      }}>
        <DialogContent className="max-w-md">
          {playingAudio && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-foreground truncate">{playingAudio.title}</h3>
              </div>
              <audio
                ref={audioRef}
                src={playingAudio.url}
                controls
                autoPlay
                className="w-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

PortfolioGrid.displayName = 'PortfolioGrid';
