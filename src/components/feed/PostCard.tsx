
import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePostLikes } from "@/hooks/usePostLikes";
import { usePostShares } from "@/hooks/usePostShares";

export interface PostCardProps {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    profession?: string;
  };
  imageUrl?: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
  className?: string;
}

export function PostCard({
  id,
  author,
  imageUrl,
  caption,
  likes,
  comments,
  timeAgo,
  className,
}: PostCardProps) {
  const [saved, setSaved] = useState(false);
  
  // Використовуємо хуки для лайків та репостів
  const { liked, likesCount, toggleLike, isLoading: likesLoading } = usePostLikes(id, likes);
  const { shared, toggleShare, isLoading: sharesLoading } = usePostShares(id);

  return (
    <div className={cn("creative-card card-hover", className)}>
      {/* Заголовок публікації */}
      <div className="flex items-center justify-between p-3">
        <Link to={`/profile/${author.id}`} className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={author.avatarUrl} alt={author.name} />
            <AvatarFallback>
              {author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{author.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">@{author.username}</span>
              {author.profession && (
                <span className={`profession-badge profession-badge-${author.profession.toLowerCase()} text-[10px]`}>
                  {author.profession}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Зображення - показуємо тільки якщо є */}
      {imageUrl && (
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={caption}
            className="h-full w-full object-cover transition-all hover:scale-105"
          />
        </div>
      )}

      {/* Дії */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={toggleLike}
              disabled={likesLoading}
            >
              <Heart 
                className={cn("h-5 w-5 transition-all", liked && "fill-destructive text-destructive")} 
              />
              <span className="sr-only">Лайк</span>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MessageCircle className="h-5 w-5" />
              <span className="sr-only">Коментар</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={toggleShare}
              disabled={sharesLoading}
            >
              <Share2 
                className={cn("h-5 w-5 transition-all", shared && "fill-primary text-primary")} 
              />
              <span className="sr-only">Поширити</span>
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setSaved(!saved)}
          >
            <Bookmark 
              className={cn("h-5 w-5", saved && "fill-secondary text-secondary")} 
            />
            <span className="sr-only">Зберегти</span>
          </Button>
        </div>

        {/* Лайки */}
        <div className="mt-2">
          <span className="text-sm font-semibold">{likesCount} вподобань</span>
        </div>

        {/* Опис */}
        <div className="mt-1">
          <p className="text-sm">
            <Link to={`/profile/${author.id}`} className="font-semibold">
              {author.name}
            </Link>{" "}
            {caption}
          </p>
        </div>

        {/* Коментарі та час */}
        <div className="mt-1 flex flex-col">
          <Link to={`/post/${id}`} className="text-sm text-muted-foreground">
            Переглянути всі {comments} коментарів
          </Link>
          <span className="mt-1 text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
