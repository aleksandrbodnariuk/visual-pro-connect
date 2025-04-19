import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Search, UserRound, FileVideo, Image, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: string;
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string;
  } | null;
}

export function PortfolioManagementTab() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState<PortfolioItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    fetchPortfolioItems();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = portfolioItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(portfolioItems);
    }
  }, [searchTerm, portfolioItems]);

  const fetchPortfolioItems = async () => {
    try {
      setIsLoading(true);
      // Спроба отримати дані з Supabase
      try {
        const { data, error } = await supabase
          .from("portfolio")
          .select(`
            *,
            user:user_id (
              full_name,
              avatar_url
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setPortfolioItems(data);
          setFilteredItems(data);
          return;
        }
      } catch (supabaseError) {
        console.warn("Не вдалося отримати дані з Supabase:", supabaseError);
      }
      
      // Якщо дані не отримано з Supabase, використовуємо локальне сховище
      const storedItems = localStorage.getItem("portfolioItems");
      if (storedItems) {
        const parsedItems = JSON.parse(storedItems);
        setPortfolioItems(parsedItems);
        setFilteredItems(parsedItems);
        return;
      }
      
      // Якщо немає даних ні в Supabase, ні в локальному сховищі, використовуємо демо-дані
      const demoData = [
        {
          id: "demo1",
          user_id: "user1",
          title: "Портретна фотосесія",
          description: "Студійна зйомка портретів",
          media_url: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
          media_type: "photo",
          created_at: new Date().toISOString(),
          user: {
            full_name: "Олександр Петренко",
            avatar_url: "https://i.pravatar.cc/150?img=1"
          }
        },
        {
          id: "demo2",
          user_id: "user2",
          title: "Відеопрезентація продукту",
          description: "Промо-відео для нової колекції",
          media_url: "https://example.com/video1.mp4",
          media_type: "video",
          created_at: new Date().toISOString(),
          user: {
            full_name: "Марія Коваленко",
            avatar_url: "https://i.pravatar.cc/150?img=5"
          }
        }
      ];
      
      setPortfolioItems(demoData);
      setFilteredItems(demoData);
      localStorage.setItem("portfolioItems", JSON.stringify(demoData));
    } catch (error: any) {
      toast.error("Помилка при завантаженні медіа");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDeleteDialog = (item: PortfolioItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      // Спроба видалити запис з Supabase
      try {
        if (!/^demo/.test(selectedItem.id)) {
          const { error: deleteRecordError } = await supabase
            .from("portfolio")
            .delete()
            .eq("id", selectedItem.id);

          if (deleteRecordError) throw deleteRecordError;
          
          // Спроба видалити файл зі сховища
          try {
            const filePathMatch = selectedItem.media_url.match(/\/([^/?#]+)(?:[?#]|$)/);
            const fileName = filePathMatch ? filePathMatch[1] : null;
            
            if (fileName) {
              const filePath = `${selectedItem.user_id}/${fileName}`;
              await supabase.storage
                .from("portfolio")
                .remove([filePath]);
            }
          } catch (deleteStorageError) {
            console.warn("Не вдалося видалити файл зі сховища:", deleteStorageError);
          }
        }
      } catch (supabaseError) {
        console.warn("Не вдалося видалити запис з Supabase:", supabaseError);
      }

      // Оновлюємо локальний стан
      const updatedItems = portfolioItems.filter(i => i.id !== selectedItem.id);
      setPortfolioItems(updatedItems);
      
      // Оновлюємо локальне сховище
      localStorage.setItem("portfolioItems", JSON.stringify(updatedItems));
      
      toast.success("Файл успішно видалено");
    } catch (error: any) {
      toast.error("Помилка при видаленні файлу");
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleApprove = (item: PortfolioItem) => {
    toast.success(`Медіа "${item.title}" схвалено`);
    // Тут можна додати логіку для позначення файлу як схваленого
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управління медіа</CardTitle>
        <CardDescription>Перегляд та модерація вмісту портфоліо користувачів</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="search">Пошук медіа</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Введіть назву, опис або ім'я користувача..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10">Завантаження...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Не знайдено жодного елемента медіа</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {item.media_type === "photo" ? (
                    <img 
                      src={item.media_url} 
                      alt={item.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FileVideo className="h-12 w-12 text-muted-foreground" />
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Відео
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      {item.user?.avatar_url ? (
                        <AvatarImage src={item.user.avatar_url} alt={item.user?.full_name || 'Користувач'} />
                      ) : (
                        <AvatarFallback>
                          <UserRound className="h-3 w-3" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {item.user?.full_name || 'Невідомий користувач'}
                    </span>
                  </div>
                  <h4 className="font-medium truncate">{item.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {item.description || "Без опису"}
                  </p>
                  <div className="mt-4 flex justify-between gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleOpenDeleteDialog(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Видалити
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleApprove(item)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Схвалити
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Підтвердження видалення</DialogTitle>
              <DialogDescription>
                Ви впевнені, що хочете видалити "{selectedItem?.title}"? Ця дія незворотна.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Скасувати
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Видалити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
