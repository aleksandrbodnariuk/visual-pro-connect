
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Plus, MessageSquare, Menu, User, Bell, Search, Settings, LogOut, Camera, Video, Music, Mic, Sparkles, UtensilsCrossed, Car, Flower2, UserPlus, FolderOpen, Image } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORY_LINKS = [
  { id: "photographer", name: "Фотографи", icon: Camera, color: "from-pink-500 to-rose-500" },
  { id: "videographer", name: "Відеографи", icon: Video, color: "from-purple-500 to-indigo-500" },
  { id: "musician", name: "Музиканти", icon: Music, color: "from-blue-500 to-cyan-500" },
  { id: "host", name: "Ведучі", icon: Mic, color: "from-amber-500 to-orange-500" },
  { id: "pyrotechnician", name: "Піротехніки", icon: Sparkles, color: "from-red-500 to-orange-500" },
  { id: "restaurant", name: "Ресторани", icon: UtensilsCrossed, color: "from-emerald-500 to-teal-500" },
  { id: "transport", name: "Транспорт", icon: Car, color: "from-slate-500 to-gray-500" },
  { id: "florist", name: "Флористи", icon: Flower2, color: "from-pink-400 to-rose-400" },
];

export function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Не показуємо для неавторизованих користувачів
  if (!currentUser) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("currentUser");
      toast.success("Ви успішно вийшли");
      navigate("/auth");
      setIsMenuOpen(false);
    } catch (error) {
      toast.error("Помилка при виході");
    }
  };

  const navItems = [
    { path: "/", icon: Home, label: "Головна" },
    { path: "/friends", icon: Users, label: "Друзі" },
    { path: "create", icon: Plus, label: "Нове", isAction: true },
    { path: "/messages", icon: MessageSquare, label: "Чати", badge: unreadCount },
    { path: "menu", icon: Menu, label: "Меню", isSheet: true },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            if (item.isAction) {
              // Кнопка створення публікації
              return (
                <button
                  key={item.path}
                  onClick={() => setIsCreatePostOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                    <item.icon className="h-5 w-5" />
                  </div>
                </button>
              );
            }

            if (item.isSheet) {
              // Кнопка меню (Sheet)
              return (
                <Sheet key={item.path} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <button className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-colors">
                      <item.icon className="h-6 w-6" />
                      <span className="text-[10px] mt-1">{item.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[350px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Меню</SheetTitle>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-2">
                      {/* Основні посилання */}
                      <Link
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span>Мій профіль</span>
                      </Link>
                      
                      <Link
                        to="/notifications"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Bell className="h-5 w-5" />
                        <span>Сповіщення</span>
                      </Link>
                      
                      <Link
                        to="/connect"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <UserPlus className="h-5 w-5" />
                        <span>Знайти друзів</span>
                      </Link>
                      
                      <Link
                        to="/search"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Search className="h-5 w-5" />
                        <span>Знайти професіоналів</span>
                      </Link>
                      
                      <Link
                        to="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                        <span>Налаштування</span>
                      </Link>
                      
                      <Separator className="my-4" />
                      
                      {/* Мої файли */}
                      <p className="text-sm font-medium text-muted-foreground px-3 mb-2">Мої файли</p>
                      
                      <Link
                        to="/my-files/photos"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Image className="h-5 w-5" />
                        <span>Фото</span>
                      </Link>
                      <Link
                        to="/my-files/videos"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Video className="h-5 w-5" />
                        <span>Відео</span>
                      </Link>
                      <Link
                        to="/my-files/music"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Music className="h-5 w-5" />
                        <span>Музика</span>
                      </Link>
                      
                      <Separator className="my-4" />
                      
                      {/* Категорії */}
                      <p className="text-sm font-medium text-muted-foreground px-3 mb-2">Категорії</p>
                      
                      {CATEGORY_LINKS.map((category) => (
                        <Link
                          key={category.id}
                          to={`/search?category=${category.id}`}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className={`p-1.5 rounded-full bg-gradient-to-r ${category.color}`}>
                            <category.icon className="h-4 w-4 text-white" />
                          </div>
                          <span>{category.name}</span>
                        </Link>
                      ))}
                      
                      <Separator className="my-4" />
                      
                      {/* Вихід */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Вийти
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            // Звичайні посилання
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive(item.path) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <item.icon className="h-6 w-6" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Modal for creating post */}
      {currentUser && (
        <CreatePublicationModal
          open={isCreatePostOpen}
          onOpenChange={setIsCreatePostOpen}
          userId={currentUser.id}
          onSuccess={() => {
            setIsCreatePostOpen(false);
            toast.success("Публікацію створено!");
          }}
        />
      )}
    </>
  );
}
