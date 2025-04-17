
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Home, Search, Bell, MessageSquare, User, Settings, Users, Image, Music, Video, Zap } from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Меню</h2>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Головна
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Пошук
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/notifications">
              <Bell className="mr-2 h-4 w-4" />
              Сповіщення
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Повідомлення
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/profile">
              <User className="mr-2 h-4 w-4" />
              Профіль
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Налаштування
            </Link>
          </Button>
        </nav>
      </div>
      
      <div className="border-t p-4">
        <h2 className="text-lg font-semibold mb-4">Категорії</h2>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/photographers">
              <Image className="mr-2 h-4 w-4" />
              Фотографи
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/videographers">
              <Video className="mr-2 h-4 w-4" />
              Відеографи
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/musicians">
              <Music className="mr-2 h-4 w-4" />
              Музиканти
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/hosts">
              <Users className="mr-2 h-4 w-4" />
              Ведучі
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/pyrotechnics">
              <Zap className="mr-2 h-4 w-4" />
              Піротехніки
            </Link>
          </Button>
        </nav>
      </div>
      
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-medium mb-2">Розширте свою мережу</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Знаходьте нових клієнтів та партнерів для співпраці
          </p>
          <Button size="sm" className="w-full" asChild>
            <Link to="/connect">Знайти контакти</Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
