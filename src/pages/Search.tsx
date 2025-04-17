
import { useState } from "react";
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
  Star 
} from "lucide-react";
import { SearchCategories } from "@/components/search/SearchCategories";

// Тестові дані для демонстрації
const PROFESSIONALS = [
  {
    id: "user1",
    name: "Олександр Петренко",
    username: "alex_photo",
    profession: "Photo",
    avatar: "https://i.pravatar.cc/150?img=1",
    location: "Київ, Україна",
    rating: 4.9,
    reviewCount: 24,
    tags: ["портретна", "комерційна", "весільна"],
    bio: "Професійний фотограф з 7-річним досвідом."
  },
  {
    id: "user2",
    name: "Марія Коваленко",
    username: "maria_video",
    profession: "Video",
    avatar: "https://i.pravatar.cc/150?img=5",
    location: "Львів, Україна",
    rating: 4.8,
    reviewCount: 18,
    tags: ["кліпи", "реклама", "короткометражки"],
    bio: "Відеограф з досвідом у рекламній індустрії."
  },
  {
    id: "user3",
    name: "Ігор Мельник",
    username: "igor_music",
    profession: "Music",
    avatar: "https://i.pravatar.cc/150?img=8",
    location: "Одеса, Україна",
    rating: 4.7,
    reviewCount: 32,
    tags: ["діджей", "продюсер", "композитор"],
    bio: "Музичний продюсер і діджей з власною студією."
  },
  {
    id: "user6",
    name: "Анна Михайленко",
    username: "anna_event",
    profession: "Event",
    avatar: "https://i.pravatar.cc/150?img=16",
    location: "Харків, Україна",
    rating: 5.0,
    reviewCount: 42,
    tags: ["весілля", "корпоративи", "дні народження"],
    bio: "Професійний ведучий з 10-річним досвідом проведення заходів."
  },
  {
    id: "user8",
    name: "Сергій Лисенко",
    username: "serhii_pyro",
    profession: "Pyro",
    avatar: "https://i.pravatar.cc/150?img=57",
    location: "Дніпро, Україна",
    rating: 4.6,
    reviewCount: 15,
    tags: ["феєрверки", "піротехнічні шоу", "спецефекти"],
    bio: "Фахівець з піротехніки та спецефектів для вечірок та заходів."
  }
];

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [professionFilter, setProfessionFilter] = useState("");
  
  // Фільтрація спеціалістів на основі фільтрів
  const filteredProfessionals = PROFESSIONALS.filter((professional) => {
    const matchesSearch = 
      professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesLocation = 
      !locationFilter || professional.location.toLowerCase().includes(locationFilter.toLowerCase());
      
    const matchesProfession = 
      !professionFilter || professional.profession.toLowerCase() === professionFilter.toLowerCase();
      
    return matchesSearch && matchesLocation && matchesProfession;
  });

  return (
    <div className="min-h-screen pb-10">
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
                    placeholder="Імя, спеціалізація, теги..."
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
                <Select value={professionFilter} onValueChange={setProfessionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Виберіть категорію" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі категорії</SelectItem>
                    <SelectItem value="photo">Фотографи</SelectItem>
                    <SelectItem value="video">Відеографи</SelectItem>
                    <SelectItem value="music">Музиканти</SelectItem>
                    <SelectItem value="event">Ведучі</SelectItem>
                    <SelectItem value="pyro">Піротехніки</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button size="lg" className="bg-gradient-purple px-8">
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
                      <AvatarImage src={professional.avatar} alt={professional.name} />
                      <AvatarFallback>
                        {professional.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-semibold">{professional.name}</h3>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">@{professional.username}</span>
                        <span className={`profession-badge profession-badge-${professional.profession.toLowerCase()} text-xs`}>
                          {professional.profession}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{professional.location}</span>
                      </div>
                      
                      <div className="mt-1 flex items-center">
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="ml-1 text-xs font-medium">{professional.rating}</span>
                        </div>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({professional.reviewCount} відгуків)
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t p-4">
                    <p className="text-sm text-muted-foreground">{professional.bio}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {professional.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/profile/${professional.id}`}
                      >
                        Профіль
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-gradient-purple flex-1"
                        onClick={() => window.location.href = `/messages`}
                      >
                        Написати
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
