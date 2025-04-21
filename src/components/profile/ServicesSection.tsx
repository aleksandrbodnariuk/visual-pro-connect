import { Button } from "@/components/ui/button";
import { Edit, ExternalLink, Youtube, Instagram, Video, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface ServicesSectionProps {
  isCurrentUser: boolean;
  categories?: string[];
  onEditServices?: () => void;
  editMode?: boolean;
}

interface Service {
  id: string;
  title: string;
  price: string;
  description: string;
}

export function ServicesSection({ isCurrentUser, categories, onEditServices, editMode = false }: ServicesSectionProps) {
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [servicesEditOpen, setServicesEditOpen] = useState(editMode);
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState<Service>({
    id: '',
    title: '',
    price: '',
    description: ''
  });

  useEffect(() => {
    if (editMode) {
      setServicesEditOpen(true);
    }
  }, [editMode]);

  useEffect(() => {
    const savedServices = localStorage.getItem(`services_${categories?.[0] || 'default'}`);
    if (savedServices) {
      try {
        setServices(JSON.parse(savedServices));
      } catch (e) {
        console.error("Помилка при завантаженні послуг:", e);
      }
    } else {
      const defaultServices = getDefaultServices(categories?.[0]);
      setServices(defaultServices);
      localStorage.setItem(`services_${categories?.[0] || 'default'}`, JSON.stringify(defaultServices));
    }
  }, [categories]);

  const getDefaultServices = (category?: string): Service[] => {
    if (category === 'photographer') {
      return [
        {
          id: '1',
          title: 'Портретна фотосесія',
          price: 'від 1500 грн',
          description: 'Індивідуальна фотосесія в студії або на локації. До 2 годин зйомки, 30 оброблених фотографій.'
        },
        {
          id: '2',
          title: 'Комерційна зйомка',
          price: 'від 3000 грн',
          description: 'Фотографії для соціальних мереж, каталогів та реклами. До 4 годин зйомки, 50 оброблених фотографій.'
        },
        {
          id: '3',
          title: 'Весільна фотографія',
          price: 'від 8000 грн',
          description: 'Повний день зйомки весілля, від зборів до першого танцю. 300+ оброблених фотографій, фотокнига.'
        }
      ];
    } else if (category === 'videographer') {
      return [
        {
          id: '1',
          title: 'Відеозйомка події',
          price: 'від 3500 грн',
          description: 'Професійна відеозйомка вашої події. До 6 годин зйомки, монтаж, кольорокорекція.'
        }
      ];
    } else if (category === 'musician') {
      return [
        {
          id: '1',
          title: 'Виступ на заході',
          price: 'від 5000 грн',
          description: 'Музичний супровід вашого заходу. Різноманітний репертуар, професійна апаратура.'
        }
      ];
    } else {
      return [
        {
          id: '1',
          title: 'Професійна послуга',
          price: 'від 2000 грн',
          description: 'Індивідуальний підхід та професійна реалізація ваших побажань.'
        }
      ];
    }
  };

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

  const handleEditServices = () => {
    if (onEditServices) {
      onEditServices();
    } else {
      setServicesEditOpen(true);
    }
  };

  const saveVideo = () => {
    const videoLinks = {
      youtube: youtubeUrl,
      instagram: instagramUrl,
      tiktok: tiktokUrl
    };
    
    localStorage.setItem("videoLinks", JSON.stringify(videoLinks));
    toast.success("Посилання на відео збережено");
    setVideoDialogOpen(false);
  };

  const handleSaveService = () => {
    if (!newService.title) {
      toast.error("Введіть назву послуги");
      return;
    }

    const updatedServices = [...services];
    
    if (newService.id) {
      const index = services.findIndex(s => s.id === newService.id);
      if (index !== -1) {
        updatedServices[index] = newService;
      }
    } else {
      updatedServices.push({
        ...newService,
        id: Date.now().toString()
      });
    }
    
    setServices(updatedServices);
    localStorage.setItem(`services_${categories?.[0] || 'default'}`, JSON.stringify(updatedServices));
    toast.success("Послугу збережено");
    
    setNewService({
      id: '',
      title: '',
      price: '',
      description: ''
    });
  };

  const handleEditService = (service: Service) => {
    setNewService(service);
  };

  const handleDeleteService = (id: string) => {
    const updatedServices = services.filter(s => s.id !== id);
    setServices(updatedServices);
    localStorage.setItem(`services_${categories?.[0] || 'default'}`, JSON.stringify(updatedServices));
    toast.success("Послугу видалено");
  };

  useEffect(() => {
    const savedLinks = localStorage.getItem("videoLinks");
    if (savedLinks) {
      try {
        const links = JSON.parse(savedLinks);
        setYoutubeUrl(links.youtube || "");
        setInstagramUrl(links.instagram || "");
        setTiktokUrl(links.tiktok || "");
      } catch (e) {
        console.error("Помилка при завантаженні посилань:", e);
      }
    }
  }, []);

  const getEmbedUrl = (url: string, platform: 'youtube' | 'instagram' | 'tiktok') => {
    if (!url) return null;
    
    try {
      if (platform === 'youtube') {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        if (match && match[1]) {
          return `https://www.youtube.com/embed/${match[1]}`;
        }
      }
      
      return url;
    } catch (error) {
      console.error("Error parsing video URL:", error);
      return null;
    }
  };

  const hasVideos = youtubeUrl || instagramUrl || tiktokUrl;

  return (
    <div className="rounded-xl border p-6">
      {!editMode && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Мої послуги</h2>
          {isCurrentUser && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEditServices}>
                <Edit className="h-4 w-4 mr-2" /> Редагувати послуги
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddVideo}>
                <Video className="h-4 w-4 mr-2" /> Додати відео
              </Button>
            </div>
          )}
        </div>
      )}
      
      {editMode && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Керування послугами</h2>
        </div>
      )}
      
      {categories && categories.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((category: string) => (
            <Badge key={category} variant="secondary" className="text-sm">
              {getCategoryName(category)}
            </Badge>
          ))}
        </div>
      ) : null}
      
      {(editMode || servicesEditOpen) ? (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="serviceTitle">Назва послуги</Label>
            <Input
              id="serviceTitle"
              value={newService.title}
              onChange={(e) => setNewService({...newService, title: e.target.value})}
              placeholder="Наприклад: Фотосесія в студії"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="servicePrice">Ціна</Label>
            <Input
              id="servicePrice"
              value={newService.price}
              onChange={(e) => setNewService({...newService, price: e.target.value})}
              placeholder="Наприклад: від 1500 грн"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="serviceDescription">Опис</Label>
            <Textarea
              id="serviceDescription"
              value={newService.description}
              onChange={(e) => setNewService({...newService, description: e.target.value})}
              placeholder="Детальний опис послуги"
              rows={4}
            />
          </div>
          
          <Button onClick={handleSaveService} className="w-full">
            {newService.id ? 'Оновити послугу' : 'Додати послугу'}
          </Button>
          
          {services.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-2">Існуючі послуги</h4>
              <div className="space-y-2">
                {services.map(service => (
                  <div key={service.id} className="flex justify-between items-center p-2 border rounded">
                    <span className="truncate mr-2">{service.title}</span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditService(service)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteService(service.id)}
                      >
                        Видалити
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!editMode && (
            <Button 
              variant="outline" 
              onClick={() => {
                setServicesEditOpen(false);
                setNewService({
                  id: '',
                  title: '',
                  price: '',
                  description: ''
                });
              }}
              className="mt-4"
            >
              Закрити редагування
            </Button>
          )}
          
          {editMode && (
            <div className="mt-8 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Керування відео</h3>
                <Button variant="outline" size="sm" onClick={handleAddVideo}>
                  <Plus className="h-4 w-4 mr-2" /> Додати відео
                </Button>
              </div>
              
              {(youtubeUrl || instagramUrl || tiktokUrl) ? (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {youtubeUrl && (
                    <div className="rounded-lg overflow-hidden border p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <Youtube className="h-4 w-4 mr-2 text-red-600" />
                          <span className="text-sm font-medium">YouTube</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setYoutubeUrl("");
                            const links = JSON.parse(localStorage.getItem("videoLinks") || "{}");
                            links.youtube = "";
                            localStorage.setItem("videoLinks", JSON.stringify(links));
                            toast.success("Посилання видалено");
                          }}
                        >
                          Видалити
                        </Button>
                      </div>
                      <Input
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          const links = JSON.parse(localStorage.getItem("videoLinks") || "{}");
                          links.youtube = youtubeUrl;
                          localStorage.setItem("videoLinks", JSON.stringify(links));
                          toast.success("Посилання збережено");
                        }}
                      >
                        Зберегти зміни
                      </Button>
                    </div>
                  )}
                  
                  {instagramUrl && (
                    <div className="rounded-lg overflow-hidden border p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                          <span className="text-sm font-medium">Instagram</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setInstagramUrl("");
                            const links = JSON.parse(localStorage.getItem("videoLinks") || "{}");
                            links.instagram = "";
                            localStorage.setItem("videoLinks", JSON.stringify(links));
                            toast.success("Посилання видалено");
                          }}
                        >
                          Видалити
                        </Button>
                      </div>
                      <Input
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="https://www.instagram.com/p/..."
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          const links = JSON.parse(localStorage.getItem("videoLinks") || "{}");
                          links.instagram = instagramUrl;
                          localStorage.setItem("videoLinks", JSON.stringify(links));
                          toast.success("Посилання збережено");
                        }}
                      >
                        Зберегти зміни
                      </Button>
                    </div>
                  )}
                  
                  {tiktokUrl && (
                    <div className="rounded-lg overflow-hidden border p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <Video className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">TikTok</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setTiktokUrl("");
                            const links = JSON.parse(localStorage.getItem("videoLinks") || "{}");
                            links.tiktok = "";
                            localStorage.setItem("videoLinks", JSON.stringify(links));
                            toast.success("Посилання видалено");
                          }}
                        >
                          Видалити
                        </Button>
                      </div>
                      <Input
                        value={tiktokUrl}
                        onChange={(e) => setTiktokUrl(e.target.value)}
                        placeholder="https://www.tiktok.com/@username/video/..."
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          const links = JSON.parse(localStorage.getItem("videoLinks") || "{}");
                          links.tiktok = tiktokUrl;
                          localStorage.setItem("videoLinks", JSON.stringify(links));
                          toast.success("Посилання збережено");
                        }}
                      >
                        Зберегти зміни
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>У вас ще немає доданих відео</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {services.map(service => (
            <div key={service.id} className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{service.title}</h3>
                <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">{service.price}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {service.description}
              </p>
              {isCurrentUser && !editMode && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditService(service)}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Редагувати
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteService(service.id)}
                  >
                    Видалити
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasVideos && !editMode && !servicesEditOpen && (
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
