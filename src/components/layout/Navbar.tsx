
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, Camera, Home, MessageCircle, PlusSquare, Search, User, LogOut } from "lucide-react";
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

export function Navbar() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  useEffect(() => {
    // Отримуємо дані користувача з localStorage
    const userJSON = localStorage.getItem("currentUser");
    if (userJSON) {
      const user = JSON.parse(userJSON);
      
      // Перевіряємо, чи це засновник і оновлюємо його статус якщо потрібно
      if (user.phoneNumber === "0507068007" && 
         (!user.isFounder || !user.isAdmin || user.role !== "admin-founder")) {
        
        const updatedUser = {
          ...user,
          isAdmin: true,
          isFounder: true,
          role: "admin-founder",
          isShareHolder: true,
          status: "Адміністратор-засновник"
        };
        
        // Оновлюємо дані в localStorage
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        
        // Оновлюємо список користувачів
        const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
        const updatedUsers = storedUsers.map((u: any) => {
          if (u.phoneNumber === "0507068007" || u.id === user.id) {
            return {
              ...u,
              isAdmin: true,
              isFounder: true,
              role: "admin-founder",
              isShareHolder: true,
              status: "Адміністратор-засновник"
            };
          }
          return u;
        });
        
        localStorage.setItem("users", JSON.stringify(updatedUsers));
      } else {
        setCurrentUser(user);
      }
    }
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    toast.success("Ви вийшли з системи");
    navigate("/");
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-2">
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
                onClick={() => window.location.href = '/search'}
              />
            </div>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 md:gap-2">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Home className="h-5 w-5" />
              <span className="sr-only">{t.home}</span>
            </Button>
          </Link>
          
          <Link to="/messages">
            <Button variant="ghost" size="icon" className="rounded-full">
              <MessageCircle className="h-5 w-5" />
              <span className="sr-only">{t.messages}</span>
            </Button>
          </Link>
          
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">{t.notifications}</span>
            </Button>
          </Link>
          
          <Button variant="ghost" size="icon" className="rounded-full hidden md:flex">
            <PlusSquare className="h-5 w-5" />
            <span className="sr-only">Створити</span>
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
                  <DropdownMenuItem onClick={() => navigate(`/profile/${currentUser.id}`)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t.profile}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <PlusSquare className="mr-2 h-4 w-4" />
                    <span>Створити публікацію</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/search')}>
                    <Search className="mr-2 h-4 w-4" />
                    <span>Знайти професіоналів</span>
                  </DropdownMenuItem>
                  
                  {/* Доступ до адмін-панелі для адміністраторів */}
                  {(currentUser.isAdmin || currentUser.role === "admin" || 
                    currentUser.role === "admin-founder" || currentUser.phoneNumber === "0507068007") && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Панель адміністратора</span>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Доступ до ринку акцій для акціонерів */}
                  {(currentUser.isShareHolder || currentUser.role === "shareholder" || 
                    currentUser.status === "Акціонер" || currentUser.phoneNumber === "0507068007") && (
                    <DropdownMenuItem onClick={() => navigate('/stock-market')}>
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
            <Button variant="secondary" size="sm" onClick={() => navigate('/auth')}>
              Увійти
            </Button>
          )}
          
          <NavbarActions />
        </nav>
      </div>
    </header>
  );
}

function Menu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
