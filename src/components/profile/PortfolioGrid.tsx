import { Link } from "react-router-dom";
import { Camera, Music, Video, Play, Heart, MessageCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, memo } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
}

// Use React.memo to prevent unnecessary re-renders
export const PortfolioGrid = memo(({ items: initialItems, className, userId, isOwner = false }: PortfolioGridProps) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  
  // If we have a userId, try to fetch real portfolio items
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
            // Map Supabase data to our format with proper type casting
            const formattedItems = data.map(item => {
              // Convert media_type to one of the allowed types
              let mediaType: "photo" | "video" | "audio" = "photo"; // Default to photo
              
              if (item.media_type === 'video') {
                mediaType = "video";
              } else if (item.media_type === 'audio') {
                mediaType = "audio";
              }
              
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
          } else if (initialItems && initialItems.length > 0) {
            // Fallback to initial items
            setPortfolioItems(initialItems);
          }
        } catch (error) {
          console.error("Error fetching portfolio:", error);
          // Fallback to initial items
          if (initialItems && initialItems.length > 0) {
            setPortfolioItems(initialItems);
          }
        } finally {
          setLoading(false);
        }
      };
      
      fetchPortfolioItems();
    }
  }, [userId, initialItems]);
  
  const handleEdit = (id: string) => {
    // Implement edit functionality
    toast.info(`Редагування елементу ${id}`);
  };
  
  const handleDelete = (id: string) => {
    // Remove item locally
    setPortfolioItems(portfolioItems.filter(item => item.id !== id));
    toast.success("Елемент портфоліо видалено");
  };

  if (loading) {
    return <div className="text-center py-8">Завантаження портфоліо...</div>;
  }

  if (portfolioItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>У портфоліо ще немає елементів</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4", className)}>
      {portfolioItems.map((item) => (
        <div key={item.id} className="group relative overflow-hidden rounded-lg">
          <div className="aspect-square w-full overflow-hidden">
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy" // Add lazy loading for better performance
            />
          </div>
          
          {/* Тип медіа */}
          <div className="absolute left-2 top-2 rounded-full bg-black/70 p-1.5 text-white">
            {item.type === "photo" && <Camera className="h-4 w-4" />}
            {item.type === "video" && <Video className="h-4 w-4" />}
            {item.type === "audio" && <Music className="h-4 w-4" />}
          </div>
          
          {/* Кнопка відтворення для відео та аудіо */}
          {(item.type === "video" || item.type === "audio") && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                <Play className="h-8 w-8 text-white" fill="white" />
              </div>
            </div>
          )}
          
          {/* Опції для власника контенту */}
          {isOwner && (
            <div className="absolute right-2 top-2 z-10">
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
          
          {/* Метадані (накладення при наведенні) */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
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
      ))}
    </div>
  );
});

PortfolioGrid.displayName = 'PortfolioGrid';
