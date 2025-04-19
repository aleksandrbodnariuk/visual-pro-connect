
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { Camera, MapPin, Link as LinkIcon, Calendar, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface ProfileHeaderProps {
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio: string;
    location?: string;
    website?: string;
    joinDate: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    profession?: string;
    isCurrentUser?: boolean;
  };
  onEditProfile?: () => void;
}

export function ProfileHeader({ user, onEditProfile }: ProfileHeaderProps) {
  const { sendFriendRequest, friends } = useFriendRequests();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  
  const {
    id: userId,
    name,
    username,
    avatarUrl,
    coverUrl,
    bio,
    location,
    website,
    joinDate,
    followersCount,
    followingCount,
    postsCount,
    profession,
    isCurrentUser
  } = user;

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    };
    
    checkCurrentUser();
  }, []);

  useEffect(() => {
    // Check if this user is already a friend
    if (friends && userId) {
      const friendExists = friends.some(friend => friend?.id === userId);
      setIsFriend(friendExists);
    }
  }, [friends, userId]);

  const handleAddFriend = async () => {
    if (!currentUserId) {
      toast.error('Ви повинні увійти в систему');
      return;
    }
    
    await sendFriendRequest(userId);
    toast.success('Запит у друзі надіслано');
  };

  return (
    <div className="animate-fade-in">
      {/* Обкладинка профілю */}
      <div className="relative h-44 w-full overflow-hidden rounded-b-lg md:h-64">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: coverUrl 
              ? `url(${coverUrl})` 
              : "url(https://images.unsplash.com/photo-1487887235947-a955ef187fcc)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Інформація профілю */}
      <div className="container relative -mt-20 px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
            <Avatar className="h-32 w-32 border-4 border-background">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="text-4xl">
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@{username}</span>
                {profession && (
                  <span className={`profession-badge profession-badge-${profession.toLowerCase()}`}>
                    {profession}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{location}</span>
                  </div>
                )}
                {website && (
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline"
                    >
                      {website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Приєднався {joinDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCurrentUser ? (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={onEditProfile}
              >
                <Edit className="h-4 w-4" />
                <span>Редагувати профіль</span>
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button className="bg-gradient-purple">Підписатися</Button>
                {!isFriend && currentUserId && !isCurrentUser && (
                  <Button 
                    variant="secondary" 
                    onClick={handleAddFriend}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Додати в друзі
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="max-w-2xl text-sm">{bio}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6 border-b">
          <div className="mb-4 flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{postsCount}</span>
              <span className="text-xs text-muted-foreground">Публікацій</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{followersCount}</span>
              <span className="text-xs text-muted-foreground">Підписників</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{followingCount}</span>
              <span className="text-xs text-muted-foreground">Підписок</span>
            </div>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="bg-transparent">
              <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-secondary">
                Публікації
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-secondary">
                Портфоліо
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-none border-b-2 border-transparent data-[state=active]:border-secondary">
                Послуги
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-secondary">
                Відгуки
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
