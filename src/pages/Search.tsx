
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Camera, 
  Video, 
  Music, 
  Users, 
  Sparkles, 
  Search as SearchIcon, 
  MapPin, 
  Star,
  Loader2
} from "lucide-react";
import { SearchCategories, CATEGORIES } from "@/components/search/SearchCategories";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// Функція нормалізації ID категорії (множина -> однина)
const normalizeCategoryId = (id: string): string => {
  const mapping: Record<string, string> = {
    'photographers': 'photographer',
    'videographers': 'videographer', 
    'musicians': 'musician',
    'hosts': 'host',
    'pyrotechnics': 'pyrotechnician',
    'restaurants': 'restaurant',
    'transport': 'transport',
    'confectionery': 'confectionery',
    'florists': 'florist'
  };
  return mapping[id] || id;
};

interface Professional {
  id: string;
  full_name: string;
  username?: string;
  categories: string[];
  avatar_url?: string;
  location?: string;
  bio?: string;
  country?: string;
  city?: string;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const searchParams = new URLSearchParams(location.search);
  
  // Отримуємо категорію з URL (пріоритет: path param > query param)
  useEffect(() => {
    if (categoryId) {
      // Категорія з /category/:categoryId
      const normalizedCategory = normalizeCategoryId(categoryId);
      setCategoryFilter(normalizedCategory);
    } else {
      // Категорія з ?category=...
      const categoryFromUrl = searchParams.get("category");
      if (categoryFromUrl) {
        setCategoryFilter(categoryFromUrl);
      }
    }
  }, [categoryId, location.search]);
  
  // Завантажуємо користувачів з бази даних
  useEffect(() => {
    async function fetchProfessionals() {
      try {
        setIsLoading(true);
        
        // Use secure RPC function that only returns safe public data
        const { data, error } = await supabase
          .rpc('get_safe_public_profiles');
        
        if (error) throw error;
        
        // Форматуємо дані (тепер RPC повертає categories, city, country)
        const formattedData = data.map((user: any) => ({
          id: user.id,
          full_name: user.full_name || "Користувач без імені",
          username: `user_${user.id.substring(0, 8)}`,
          avatar_url: user.avatar_url,
          categories: user.categories || [],
          bio: user.bio || "Учасник спільноти B&C",
          location: user.city && user.country 
            ? `${user.city}, ${user.country}` 
            : user.city || user.country || "",
          country: user.country,
          city: user.city
        }));
        
        setProfessionals(formattedData);
      } catch (error) {
        console.error("Помилка при завантаженні користувачів:", error);
        toast.error("Не вдалося завантажити дані");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProfessionals();
  }, []);
  
  // Фільтруємо користувачів на основі фільтрів
  useEffect(() => {
    let filtered = [...professionals];
    
    // Фільтрація за пошуковим запитом
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prof => 
        prof.full_name?.toLowerCase().includes(query) ||
        prof.bio?.toLowerCase().includes(query) ||
        prof.categories?.some(cat => {
          const category = CATEGORIES.find(c => c.id === cat);
          return category?.name.toLowerCase().includes(query);
        })
      );
    }
    
    // Фільтрація за місцезнаходженням
    if (locationFilter) {
      const locationQuery = locationFilter.toLowerCase();
      filtered = filtered.filter(prof => 
        prof.city?.toLowerCase().includes(locationQuery) ||
        prof.country?.toLowerCase().includes(locationQuery) ||
        prof.location?.toLowerCase().includes(locationQuery)
      );
    }
    
    // Фільтрація за категорією
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(prof => 
        prof.categories?.includes(categoryFilter)
      );
    }
    
    setFilteredProfessionals(filtered);
  }, [professionals, searchQuery, locationFilter, categoryFilter]);
  
  const handleSearch = () => {
    // Оновлюємо URL з параметрами пошуку
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (locationFilter) params.set("location", locationFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    
    navigate(`/search?${params.toString()}`);
  };
  
  // Функція для отримання іконки категорії
  const getCategoryIcon = (categories: string[]) => {
    if (!categories || categories.length === 0) return null;
    
    const primaryCategory = categories[0];
    const categoryData = CATEGORIES.find(cat => cat.id === primaryCategory);
    
    if (categoryData) {
      const Icon = categoryData.icon;
      return <Icon className="h-4 w-4" />;
    }
    
    return null;
  };
  
  // Функція для отримання мітки категорії
  const getCategoryLabel = (categories: string[]) => {
    if (!categories || categories.length === 0) return "Без категорії";
    
    const primaryCategory = categories[0];
    const categoryData = CATEGORIES.find(cat => cat.id === primaryCategory);
    
    return categoryData?.name || "Інше";
  };

  return (
    <div className="min-h-screen pb-safe-nav">
      <Navbar />
      
      <div className="bg-gradient-to-b from-secondary/10 to-background/5 py-10">
        <div className="container">
          <h1 className="mb-6 text-center text-3xl font-bold md:text-4xl">
            Знайти професіоналів
          </h1>
          
          <div className="mx-auto max-w-3xl rounded-2xl bg-white/80 p-6 shadow-md backdrop-blur-sm">
            <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium">Що шукаєте?</label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ім'я, спеціалізація, теги..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">Місто</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Місто чи регіон"
                    className="pl-9"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">Категорія</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Виберіть категорію" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі категорії</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button size="lg" className="bg-gradient-purple px-8" onClick={handleSearch}>
                <SearchIcon className="mr-2 h-4 w-4" />
                <span>Знайти</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mt-8">
        <SearchCategories />
        
        <div className="mt-8">
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Завантаження професіоналів...</p>
            </div>
          ) : (
            <>
              <h2 className="mb-6 text-2xl font-bold">
                {filteredProfessionals.length > 0 
                  ? `Знайдено ${filteredProfessionals.length} професіоналів`
                  : "Не знайдено жодного професіонала за вашим запитом"}
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProfessionals.map((professional) => (
                  <Card key={professional.id} className="overflow-hidden transition-all hover:shadow-md">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={professional.avatar_url} alt={professional.full_name} />
                          <AvatarFallback>
                            {professional.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h3 className="font-semibold">{professional.full_name}</h3>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">
                              {professional.username ? `@${professional.username.substring(0, 8)}` : ""}
                            </span>
                            <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs">
                              {getCategoryIcon(professional.categories)}
                              <span>{getCategoryLabel(professional.categories)}</span>
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{professional.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t p-4">
                        <p className="text-sm text-muted-foreground">{professional.bio}</p>
                        
                        <div className="mt-4 flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/profile/${professional.id}`)}
                          >
                            Профіль
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-gradient-purple flex-1"
                            onClick={() => navigate(`/messages?user=${professional.id}`)}
                          >
                            Написати
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
