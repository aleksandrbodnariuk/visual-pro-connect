import { Camera, Music, Video, Play, Heart, MessageCircle, MoreHorizontal, Edit, Trash2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, memo, useMemo } from "react";
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

// Parse video URL to get thumbnail and embed URL
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

function isVideoLink(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export const PortfolioGrid = memo(({ items: initialItems, className, userId, isOwner = false, onAddItem }: PortfolioGridProps) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [playingItem, setPlayingItem] = useState<{ embedUrl: string; title: string } | null>(null);
  
  useEffect(() => {
    if (userId) {
      const fetchPortfolioItems = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', userId);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            const formattedItems = data.map(item => {
              let mediaType: "photo" | "video" | "audio" = "photo";
              if (item.media_type === 'video') mediaType = "video";
              else if (item.media_type === 'audio') mediaType = "audio";
              
              return {
                id: item.id,
                type: mediaType,
                thumbnailUrl: item.media_url,
                title: item.title,
                likes: 0,
                comments: 0
              };
            });
            setPortfolioItems(formattedItems);
          }
        } catch (error) {
          console.error("Error fetching portfolio:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchPortfolioItems();
    }
  }, [userId, initialItems]);
  
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
      // Fallback: open original link
      window.open(item.thumbnailUrl, '_blank');
    }
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

          return (
            <div
              key={item.id}
              className={cn("group relative overflow-hidden rounded-lg", isVideo && "cursor-pointer")}
              onClick={isVideo ? () => handlePlayVideo(item) : undefined}
            >
              <div className="aspect-square w-full overflow-hidden">
                {item.type === "audio" ? (
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
                {item.type === "photo" && <Camera className="h-4 w-4" />}
                {item.type === "video" && <Video className="h-4 w-4" />}
                {item.type === "audio" && <Music className="h-4 w-4" />}
              </div>
              
              {/* Play button for video/audio */}
              {(item.type === "video" || item.type === "audio") && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
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
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-white">
                    <Heart className="h-3 w-3" /> {item.likes}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white">
                    <MessageCircle className="h-3 w-3" /> {item.comments}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
    </>
  );
});

PortfolioGrid.displayName = 'PortfolioGrid';
