
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
import { Trash2, Search, UserRound, FileVideo, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
      setPortfolioItems(data || []);
      setFilteredItems(data || []);
    } catch (error: any) {
      toast.error("Помилка при завантаженні медіа");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    try {
      // Видаляємо запис з бази даних
      const { error: deleteRecordError } = await supabase
        .from("portfolio")
        .delete()
        .eq("id", item.id);

      if (deleteRecordError) throw deleteRecordError;
      
      // Спроба видалити файл зі сховища
      try {
        // Отримуємо ім'я файлу з URL
        const filePathMatch = item.media_url.match(/\/([^/?#]+)(?:[?#]|$)/);
        const fileName = filePathMatch ? filePathMatch[1] : null;
        
        if (fileName) {
          const filePath = `${item.user_id}/${fileName}`;
          await supabase.storage
            .from("portfolio")
            .remove([filePath]);
        }
      } catch (deleteStorageError) {
        console.warn("Не вдалося видалити файл зі сховища:", deleteStorageError);
        // Не перериваємо процес, просто логуємо помилку
      }

      toast.success("Файл успішно видалено");
      // Оновлюємо локальний стан без повторного запиту
      setPortfolioItems(prevItems => prevItems.filter(i => i.id !== item.id));
    } catch (error: any) {
      toast.error("Помилка при видаленні файлу");
      console.error(error);
    }
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
                  <div className="mt-4 flex justify-between">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Видалити
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
