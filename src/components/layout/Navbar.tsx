
import { Link } from "react-router-dom";
import { Bell, Camera, Home, MessageCircle, PlusSquare, Search, User } from "lucide-react";
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

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-secondary" />
            <span className="hidden font-heading text-xl font-bold md:inline-block">
              <span className="text-gradient-purple">Visual</span>
              <span>Pro</span>
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
                placeholder="Пошук творців або контенту..."
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
              <span className="sr-only">Головна</span>
            </Button>
          </Link>
          
          <Link to="/messages">
            <Button variant="ghost" size="icon" className="rounded-full">
              <MessageCircle className="h-5 w-5" />
              <span className="sr-only">Повідомлення</span>
            </Button>
          </Link>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Сповіщення</span>
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full hidden md:flex">
            <PlusSquare className="h-5 w-5" />
            <span className="sr-only">Створити</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="@username" />
                  <AvatarFallback>МК</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Мій акаунт</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Профіль</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PlusSquare className="mr-2 h-4 w-4" />
                  <span>Створити публікацію</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/search'}>
                  <Search className="mr-2 h-4 w-4" />
                  <span>Знайти професіоналів</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span>Вийти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
