
import { Button } from "@/components/ui/button";
import { Edit, ExternalLink, Youtube, Instagram, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ServicesSectionProps {
  isCurrentUser: boolean;
  categories?: string[];
}

export function ServicesSection({ isCurrentUser, categories }: ServicesSectionProps) {
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  const getCategoryName = (categoryId: string) => {
    switch(categoryId) {
      case 'photographer': return 'Фотограф';
      case 'videographer': return 'Відеограф';
      case 'musician': return 'Музикант';
      case 'host': return 'Ведучий';
      case 'pyrotechnician': return 'Піротехнік';
      default: return categoryId;
    }
  };

  const handleAddVideo = () => {
    setVideoDialogOpen(true);
  };

  const saveVideo = () => {
    // В реальному застосунку тут був би запит до API для збереження посилань
    // Зараз просто зберігаємо в локальному сховищі для демо
    const videoLinks = {
      youtube: youtubeUrl,
      instagram: instagramUrl,
      tiktok: tiktokUrl
    };
    
    localStorage.setItem("videoLinks", JSON.stringify(videoLinks));
    toast.success("Посилання на відео збережено");
    setVideoDialogOpen(false);
  };

  // Завантаження збережених посилань
  useState(() => {
    const savedLinks = localStorage.getItem("videoLinks");
    if (savedLinks) {
      const links = JSON.parse(savedLinks);
      setYoutubeUrl(links.youtube || "");
      setInstagramUrl(links.instagram || "");
      setTiktokUrl(links.tiktok || "");
    }
  });

  const getEmbedUrl = (url: string, platform: 'youtube' | 'instagram' | 'tiktok') => {
    if (!url) return null;
    
    try {
      if (platform === 'youtube') {
        // Отримання ID відео YouTube
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        if (match && match[1]) {
          return `https://www.youtube.com/embed/${match[1]}`;
        }
      }
      
      // Можна додати обробку для інших платформ за потреби
      
      return url; // За замовчуванням просто повертаємо URL
    } catch (error) {
      console.error("Error parsing video URL:", error);
      return null;
    }
  };

  // Перевірка чи є хоча б одне відео
  const hasVideos = youtubeUrl || instagramUrl || tiktokUrl;

  return (
    <div className="rounded-xl border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Мої послуги</h2>
        {isCurrentUser && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditingServices(true)}>
              <Edit className="h-4 w-4 mr-2" /> Редагувати послуги
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddVideo}>
              <Video className="h-4 w-4 mr-2" /> Додати відео
            </Button>
          </div>
        )}
      </div>
      
      {categories && categories.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((category: string) => (
            <Badge key={category} variant="secondary" className="text-sm">
              {getCategoryName(category)}
            </Badge>
          ))}
        </div>
      ) : null}
      
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Портретна фотосесія</h3>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 1500 грн</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Індивідуальна фотосесія в студії або на локації. До 2 годин зйомки, 30 оброблених фотографій.
          </p>
        </div>
        
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Комерційна зйомка</h3>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 3000 грн</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Фотографії для соціальних мереж, каталогів та реклами. До 4 годин зйомки, 50 оброблених фотографій.
          </p>
        </div>
        
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Весільна фотографія</h3>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 8000 грн</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Повний день зйомки весілля, від зборів до першого танцю. 300+ оброблених фотографій, фотокнига.
          </p>
        </div>
      </div>

      {hasVideos && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Мої відео</h3>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {youtubeUrl && (
              <div className="rounded-lg overflow-hidden border">
                <div className="aspect-video">
                  <iframe 
                    src={getEmbedUrl(youtubeUrl, 'youtube')} 
                    className="w-full h-full" 
                    allowFullScreen
                    title="YouTube відео"
                  ></iframe>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-sm font-medium">YouTube</span>
                  <a 
                    href={youtubeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center"
                  >
                    Відкрити <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
            
            {instagramUrl && (
              <div className="rounded-lg overflow-hidden border">
                <div className="p-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                    <span className="text-sm font-medium">Instagram</span>
                  </div>
                  <a 
                    href={instagramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center"
                  >
                    Перейти <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
            
            {tiktokUrl && (
              <div className="rounded-lg overflow-hidden border">
                <div className="p-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <Video className="h-4 w-4 mr-2 text-black" />
                    <span className="text-sm font-medium">TikTok</span>
                  </div>
                  <a 
                    href={tiktokUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center"
                  >
                    Перейти <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Діалог додавання відео */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Додати посилання на відео</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube</Label>
              <div className="flex items-center">
                <Youtube className="h-4 w-4 mr-2 text-red-600" />
                <Input
                  id="youtube"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <div className="flex items-center">
                <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                <Input
                  id="instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <div className="flex items-center">
                <Video className="h-4 w-4 mr-2" />
                <Input
                  id="tiktok"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@username/video/..."
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={saveVideo}>
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
