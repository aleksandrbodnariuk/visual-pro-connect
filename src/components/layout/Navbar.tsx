
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, Home, Menu, MessageCircle, PlusSquare, Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { NavbarActions } from "./NavbarActions";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Отримуємо дані користувача з localStorage
        const userJSON = localStorage.getItem("currentUser");
        if (!userJSON) {
          return;
        }
        
        const user = JSON.parse(userJSON);
        
        try {
          // Перевіряємо, чи існує користувач в Supabase і отримуємо актуальні дані
          const { data: supabaseUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          if (error && error.code !== 'PGRST116') {
            console.error("Error fetching user from Supabase:", error);
          }
          
          if (supabaseUser) {
            // Перевіряємо, чи це засновник і оновлюємо його статус якщо потрібно
            const isFounderByPhone = supabaseUser.phone_number === "0507068007";
            
            const updatedUser = {
              ...user,
              id: supabaseUser.id,
              firstName: user.firstName || supabaseUser.full_name?.split(' ')[0] || '',
              lastName: user.lastName || supabaseUser.full_name?.split(' ')[1] || '',
              phoneNumber: user.phoneNumber || supabaseUser.phone_number || '',
              avatarUrl: user.avatarUrl || supabaseUser.avatar_url || '',
              isAdmin: supabaseUser.is_admin || isFounderByPhone,
              isFounder: supabaseUser.founder_admin || isFounderByPhone,
              isShareHolder: supabaseUser.is_shareholder || isFounderByPhone,
              role: isFounderByPhone ? "admin-founder" : 
                  (supabaseUser.is_admin ? "admin" : 
                  (supabaseUser.is_shareholder ? "shareholder" : "user")),
              status: isFounderByPhone ? "Адміністратор-засновник" : 
                    (supabaseUser.is_admin ? "Адміністратор" : 
                    (supabaseUser.is_shareholder ? "Акціонер" : "Звичайний користувач"))
            };
            
            // Оновлюємо дані в localStorage
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
            
            // Якщо це засновник (0507068007), але статуси неправильні, оновлюємо їх в Supabase
            if (isFounderByPhone && 
              (!supabaseUser.founder_admin || !supabaseUser.is_admin || !supabaseUser.is_shareholder)) {
              
              const { error: updateError } = await supabase
                .from('users')
                .update({
                  founder_admin: true,
                  is_admin: true,
                  is_shareholder: true
                })
                .eq('id', supabaseUser.id);
                
              if (updateError) {
                console.error("Error updating founder status:", updateError);
              }
            }
          } else {
            setCurrentUser(user);
          }
        } catch (supabaseError) {
          console.error("Error with Supabase:", supabaseError);
          // Якщо помилка з Supabase, використовуємо дані з localStorage
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Помилка при завантаженні даних користувача:", error);
      }
    };
    
    loadUserData();
  }, []);
  
  const handleLogout = async () => {
    try {
      localStorage.removeItem("currentUser");
      setCurrentUser(null);
      toast.success("Ви вийшли з системи");
      navigate("/");
    } catch (error) {
      console.error("Помилка при виході:", error);
      toast.error("Помилка при виході з системи");
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setTimeout(() => {
        navigate("/");
      }, 0);
    } catch (error) {
      console.error("Помилка при навігації на головну:", error);
      window.location.href = "/";
    }
  };

  const handleProfileNavigation = () => {
    try {
      if (currentUser && currentUser.id) {
        setTimeout(() => {
          navigate(`/profile/${currentUser.id}`);
        }, 0);
      } else {
        toast.error("Помилка: ID користувача не знайдено");
      }
    } catch (error) {
      console.error("Помилка при навігації до профілю:", error);
      toast.error("Виникла помилка при переході до профілю");
    }
  };

  const handleNavigate = (path: string) => {
    try {
      setTimeout(() => {
        navigate(path);
      }, 0);
    } catch (error) {
      console.error(`Помилка при навігації до ${path}:`, error);
      window.location.href = path;
    }
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-2" onClick={handleLogoClick}>
            <img 
              src="/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png" 
              alt="B&C Спільнота" 
              className="h-9 w-9" 
            />
            <span className="hidden font-heading text-xl font-bold md:inline-block">
              <span className="text-gradient-purple">Спільнота</span>
              <span> B&C</span>
            </span>
          </Link>
          
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="hidden md:flex md:w-full md:max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t.search}
                className="w-full rounded-full pl-8 md:w-[300px] lg:w-[300px]"
                onClick={() => handleNavigate('/search')}
              />
            </div>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 md:gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full" 
            onClick={() => handleNavigate('/')}
          >
            <Home className="h-5 w-5" />
            <span className="sr-only">{t.home}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full" 
            onClick={() => handleNavigate('/messages')}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="sr-only">{t.messages}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full" 
            onClick={() => handleNavigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            <span className="sr-only">{t.notifications}</span>
          </Button>
          
          {/* Кнопка "Створити публікацію" з більш помітним виглядом */}
          <Button 
            variant="secondary"
            className="hidden md:flex items-center gap-1"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusSquare className="h-4 w-4 mr-1" />
            <span>Створити</span>
          </Button>
          
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.avatarUrl || "/placeholder.svg"} alt={currentUser.name} />
                    <AvatarFallback>
                      {currentUser.firstName 
                        ? currentUser.firstName.charAt(0) + (currentUser.lastName ? currentUser.lastName.charAt(0) : '')
                        : 'ВП'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Мій акаунт</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleProfileNavigation}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t.profile}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCreateModalOpen(true)}>
                    <PlusSquare className="mr-2 h-4 w-4" />
                    <span>Створити публікацію</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate('/search')}>
                    <Search className="mr-2 h-4 w-4" />
                    <span>Знайти професіоналів</span>
                  </DropdownMenuItem>
                  
                  {/* Доступ до адмін-панелі для адміністраторів */}
                  {(currentUser.isAdmin || currentUser.role === "admin" || 
                    currentUser.role === "admin-founder" || currentUser.phoneNumber === "0507068007") && (
                    <DropdownMenuItem onClick={() => handleNavigate('/admin')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Панель адміністратора</span>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Доступ до ринку акцій для акціонерів */}
                  {(currentUser.isShareHolder || currentUser.role === "shareholder" || 
                    currentUser.status === "Акціонер" || currentUser.phoneNumber === "0507068007") && (
                    <DropdownMenuItem onClick={() => handleNavigate('/stock-market')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Ринок акцій</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Вийти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => handleNavigate('/auth')}>
              Увійти
            </Button>
          )}
          
          <NavbarActions />
        </nav>
      </div>
      
      {/* Мобільна кнопка "Створити" */}
      {currentUser && (
        <div className="md:hidden fixed bottom-20 right-4 z-40">
          <Button
            onClick={() => setIsCreateModalOpen(true)} 
            className="rounded-full w-12 h-12 shadow-lg"
          >
            <PlusSquare className="h-6 w-6" />
          </Button>
        </div>
      )}
      
      {/* Модальне вікно створення публікації */}
      {currentUser && (
        <CreatePublicationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          userId={currentUser.id}
          userName={`${currentUser.firstName || ''} ${currentUser.lastName || ''}`}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            toast.success("Публікацію створено");
          }}
        />
      )}
    </header>
  );
}
