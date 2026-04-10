import { Camera, Music, Video, Play, Heart, MessageCircle, MoreHorizontal, Edit, Trash2, Plus, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, memo, useRef } from "react";
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

interface PortfolioItem {
  id: string;
  type: "photo" | "video" | "audio";
  thumbnailUrl: string;
  title: string;
  likes: number;
  comments: number;
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
  media_type: string;
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

  return {
    id: item.id,
    type: mediaType,
    thumbnailUrl: item.media_url,
    title: item.title,
    likes: 0,
    comments: 0,
  };
};

export const PortfolioGrid = memo(({ items: initialItems, className, userId, isOwner = false, onAddItem }: PortfolioGridProps) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [playingItem, setPlayingItem] = useState<{ embedUrl: string; title: string } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; title: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ url: string; title: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (!userId) {
      setPortfolioItems(initialItems);
    }
  }, [initialItems, userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchPortfolioItems = async () => {
      setLoading(true);
      const localItems = getLocalPortfolioRecords(userId);

      try {
        const { data, error } = await supabase
          .from('portfolio')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const remoteItems = (data || []).map(mapPortfolioRecordToItem);
        const fallbackItems = localItems
          .filter((localItem) => !remoteItems.some((remoteItem) => remoteItem.id === localItem.id))
          .map(mapPortfolioRecordToItem);

        setPortfolioItems([...fallbackItems, ...remoteItems]);
      } catch (error) {
        console.error("Error fetching portfolio:", error);
        setPortfolioItems(localItems.map(mapPortfolioRecordToItem));
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioItems();
  }, [userId]);
  
  const handleEdit = (id: string) => {
    toast.info(`Редагування елементу ${id}`);
  };
  
  const handleDelete = (id: string) => {
    setPortfolioItems(portfolioItems.filter(item => item.id !== id));
    toast.success("Елемент портфоліо видалено");
  };

  const handlePlayVideo = (item: PortfolioItem) => {
    const videoData = parseVideoUrl(item.thumbnailUrl);
    if (videoData) {
      setPlayingItem({ embedUrl: videoData.embedUrl, title: item.title });
    } else {
      window.open(item.thumbnailUrl, '_blank');
    }
  };

  const handleClickPhoto = (item: PortfolioItem) => {
    setViewingPhoto({ url: item.thumbnailUrl, title: item.title });
  };

  const handlePlayAudio = (item: PortfolioItem) => {
    setPlayingAudio({ url: item.thumbnailUrl, title: item.title });
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
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4", className)}>
        {portfolioItems.map((item) => {
          const videoData = item.type === "video" ? parseVideoUrl(item.thumbnailUrl) : null;
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

      {/* Photo lightbox */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          {viewingPhoto && (
            <div className="flex items-center justify-center min-h-[50vh] max-h-[85vh] p-4">
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.title}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
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
