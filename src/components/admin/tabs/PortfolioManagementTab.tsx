
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function PortfolioManagementTab() {
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPortfolioItems();
  }, []);

  const loadPortfolioItems = async () => {
    try {
      // Завантажуємо з Supabase
      const { data: supabasePortfolio, error } = await supabase
        .from('portfolio')
        .select('*, user:user_id(*)')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.error("Помилка завантаження портфоліо з Supabase:", error);
        // Використовуємо localStorage як резерв
        const localPortfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');
        // Фільтруємо демо-контент
        const cleanedPortfolio = localPortfolio.filter((item: any) => 
          !item.title?.includes("Портретна фотосесія") &&
          !item.title?.includes("Відеопрезентація продукту") &&
          !item.description?.includes("Студійна зйомка портретів") &&
          !item.description?.includes("Промо-відео для нової колекції") &&
          item.userName !== "Олександр Петренко" &&
          item.userName !== "Марія Коваленко"
        );
        setPortfolioItems(cleanedPortfolio);
        localStorage.setItem('portfolio', JSON.stringify(cleanedPortfolio));
      } else if (supabasePortfolio && supabasePortfolio.length > 0) {
        // Фільтруємо демо-контент з Supabase
        const filteredPortfolio = supabasePortfolio.filter((item: any) => 
          !item.title?.includes("Портретна фотосесія") &&
          !item.title?.includes("Відеопрезентація продукту") &&
          !item.description?.includes("Студійна зйомка портретів") &&
          !item.description?.includes("Промо-відео для нової колекції") &&
          item.user?.full_name !== "Олександр Петренко" &&
          item.user?.full_name !== "Марія Коваленко"
        );
        setPortfolioItems(filteredPortfolio);
      } else {
        // Очищуємо localStorage від демо-контенту
        const localPortfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');
        const cleanedPortfolio = localPortfolio.filter((item: any) => 
          !item.title?.includes("Портретна фотосесія") &&
          !item.title?.includes("Відеопрезентація продукту") &&
          !item.description?.includes("Студійна зйомка портретів") &&
          !item.description?.includes("Промо-відео для нової колекції") &&
          item.userName !== "Олександр Петренко" &&
          item.userName !== "Марія Коваленко"
        );
        setPortfolioItems(cleanedPortfolio);
        localStorage.setItem('portfolio', JSON.stringify(cleanedPortfolio));
      }
    } catch (error) {
      console.error("Помилка завантаження портфоліо:", error);
      setPortfolioItems([]);
    }
  };

  const deletePortfolioItem = async (itemId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цей елемент портфоліо?")) {
      return;
    }

    try {
      // Видаляємо з Supabase
      try {
        const { error } = await supabase
          .from('portfolio')
          .delete()
          .eq('id', itemId);

        if (error) {
          console.error("Помилка видалення з Supabase:", error);
        }
      } catch (supabaseError) {
        console.warn("Не вдалося видалити з Supabase, видаляємо локально:", supabaseError);
      }

      // Видаляємо з локального стану
      const updatedItems = portfolioItems.filter(item => item.id !== itemId);
      setPortfolioItems(updatedItems);
      
      // Оновлюємо localStorage
      localStorage.setItem('portfolio', JSON.stringify(updatedItems));
      
      toast.success("Елемент портфоліо видалено");
    } catch (error) {
      console.error("Помилка видалення елемента портфоліо:", error);
      toast.error("Помилка видалення елемента портфоліо");
    }
  };

  const getMediaType = (mediaUrl: string) => {
    if (!mediaUrl) return 'unknown';
    const extension = mediaUrl.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['mp4', 'mov', 'avi', 'webm'].includes(extension || '')) {
      return 'video';
    }
    return 'unknown';
  };

  const filteredItems = portfolioItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.title?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      (item.user?.full_name || item.userName)?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управління медіа</CardTitle>
        <CardDescription>Перегляд та модерація вмісту портфоліо користувачів</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Введіть назву, опис або ім'я користувача..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Нічого не знайдено за вашим запитом" : "Немає елементів портфоліо"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-100 relative">
                  {item.media_url || item.mediaUrl ? (
                    getMediaType(item.media_url || item.mediaUrl) === 'image' ? (
                      <img 
                        src={item.media_url || item.mediaUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <video 
                        src={item.media_url || item.mediaUrl}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <span className="text-gray-500">Немає медіа</span>
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2">
                    {getMediaType(item.media_url || item.mediaUrl) === 'image' ? 'Фото' : 
                     getMediaType(item.media_url || item.mediaUrl) === 'video' ? 'Відео' : 'Невідомо'}
                  </Badge>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{item.user?.full_name || item.userName || 'Невідомий користувач'}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePortfolioItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Видалити
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
