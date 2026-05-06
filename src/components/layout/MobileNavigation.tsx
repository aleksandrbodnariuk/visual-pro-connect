
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Plus, MessageSquare, Menu, User, Bell, Search, Settings, LogOut, Camera, Video, Music, Mic, Sparkles, UtensilsCrossed, Car, Flower2, UserPlus, FolderOpen, Image, Briefcase, Crown, TrendingUp, UsersRound, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

const CATEGORY_LINKS = [
  { id: "photographer", nameKey: "photographers", icon: Camera, color: "from-pink-500 to-rose-500" },
  { id: "videographer", nameKey: "videographers", icon: Video, color: "from-purple-500 to-indigo-500" },
  { id: "musician", nameKey: "musicians", icon: Music, color: "from-blue-500 to-cyan-500" },
  { id: "host", nameKey: "hosts", icon: Mic, color: "from-amber-500 to-orange-500" },
  { id: "pyrotechnician", nameKey: "pyrotechnicians", icon: Sparkles, color: "from-red-500 to-orange-500" },
  { id: "restaurant", nameKey: "restaurants", icon: UtensilsCrossed, color: "from-emerald-500 to-teal-500" },
  { id: "transport", nameKey: "transport", icon: Car, color: "from-slate-500 to-gray-500" },
  { id: "florist", nameKey: "florists", icon: Flower2, color: "from-pink-400 to-rose-400" },
] as const;

export function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  const { language } = useLanguage();
  const t = translations[language];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isShareholder, setIsShareholder] = useState(false);
  const [hasStockAccess, setHasStockAccess] = useState(false);
  const [isRepresentative, setIsRepresentative] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) { setIsSpecialist(false); setIsAdmin(false); setIsShareholder(false); setHasStockAccess(false); setIsRepresentative(false); setIsModerator(false); return; }

    const checkRepAccess = async () => {
      try {
        for (const role of ['representative', 'manager', 'director'] as const) {
          const { data } = await supabase.rpc('has_role', { _user_id: currentUser.id, _role: role as any });
          if (data === true) return true;
        }
      } catch { /* ignore */ }
      return false;
    };

    Promise.all([
      supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'specialist' as any }),
      supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'admin' as any }),
      supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'shareholder' as any }),
      supabase.rpc('has_stock_market_access', { _user_id: currentUser.id }),
      checkRepAccess(),
      supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'moderator' as any }),
    ]).then(([specRes, adminRes, shareholderRes, stockRes, repAccess, modRes]) => {
      setIsSpecialist(specRes.data === true);
      setIsAdmin(adminRes.data === true || currentUser.founder_admin === true);
      setIsShareholder(shareholderRes.data === true || currentUser.founder_admin === true);
      setHasStockAccess(stockRes.data === true || currentUser.founder_admin === true);
      setIsRepresentative(repAccess);
      setIsModerator(modRes.data === true);
    });
  }, [currentUser?.id]);

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
    { path: "/", icon: Home, label: t.home },
    { path: "/friends", icon: Users, label: t.friends },
    { path: "create", icon: Plus, label: t.new, isAction: true },
    { path: "/messages", icon: MessageSquare, label: t.chats, badge: unreadCount },
    { path: "menu", icon: Menu, label: t.menu, isSheet: true },
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
                      <SheetTitle>{t.menu}</SheetTitle>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-2">
                      {/* Основні посилання */}
                      <Link
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span>{t.myProfile}</span>
                      </Link>
                      
                      <Link
                        to="/notifications"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Bell className="h-5 w-5" />
                        <span>{t.notifications}</span>
                      </Link>
                      
                      <Link
                        to="/connect"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <UserPlus className="h-5 w-5" />
                        <span>{t.findFriends}</span>
                      </Link>
                      
                      <Link
                        to="/search"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Search className="h-5 w-5" />
                        <span>{t.findProfessionals}</span>
                      </Link>
                      
                      <Link
                        to="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                        <span>{t.settings}</span>
                      </Link>

                      {/* Кабінет фахівця */}
                      {(isSpecialist || isAdmin) && (
                        <Link
                          to="/panel-fahivtsya"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Briefcase className="h-5 w-5" />
                          <span>{t.specialistCabinet}</span>
                        </Link>
                      )}
                      {/* Панель акціонера */}
                      {isShareholder && (
                        <Link
                          to="/shareholder-panel"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Crown className="h-5 w-5" />
                          <span>{t.shareholderPanel}</span>
                        </Link>
                      )}

                      {/* Кабінет представника */}
                      {(isRepresentative || isAdmin) && (
                        <Link
                          to="/representative-panel"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <UsersRound className="h-5 w-5" />
                          <span>{t.representativeCabinet}</span>
                        </Link>
                      )}
                      {/* Панель модератора */}
                      {(isModerator || isAdmin) && (
                        <Link
                          to="/moderator-panel"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Shield className="h-5 w-5" />
                          <span>{t.moderatorPanel}</span>
                        </Link>
                      )}
                      {hasStockAccess && (
                        <Link
                          to="/stock-market"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <TrendingUp className="h-5 w-5" />
                          <span>{t.stockMarket}</span>
                        </Link>
                      )}
                      
                      <Separator className="my-4" />
                      
                      {/* Мої файли */}
                      <p className="text-sm font-medium text-muted-foreground px-3 mb-2">{t.myFiles}</p>
                      
                      <Link
                        to="/my-files/photos"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Image className="h-5 w-5" />
                        <span>{t.photo}</span>
                      </Link>
                      <Link
                        to="/my-files/videos"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Video className="h-5 w-5" />
                        <span>{t.video}</span>
                      </Link>
                      <Link
                        to="/my-files/music"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Music className="h-5 w-5" />
                        <span>{t.musicLabel}</span>
                      </Link>
                      
                      <Separator className="my-4" />
                      
                      {/* Категорії */}
                      <p className="text-sm font-medium text-muted-foreground px-3 mb-2">{t.categories}</p>
                      
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
                          <span>{(t as any)[category.nameKey] ?? category.nameKey}</span>
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
                        {t.logout}
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
