
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ProfileStatsProps {
  likes: number;
  comments: number;
  postId?: string;
  onLike?: () => void;
}

export function ProfileStats({ likes, comments, postId, onLike }: ProfileStatsProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  useEffect(() => {
    // Перевіряємо, чи вже лайкнув користувач цей пост
    const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
    setLiked(likedPosts.includes(postId));
    
    // Оновлюємо лічильник лайків при зміні props
    setLikeCount(likes);
  }, [likes, postId]);

  const handleLike = () => {
    try {
      // Отримуємо список лайкнутих постів з localStorage
      const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
      
      if (liked) {
        // Якщо пост вже лайкнутий, прибираємо лайк
        const newLikedPosts = likedPosts.filter((id: string) => id !== postId);
        localStorage.setItem("likedPosts", JSON.stringify(newLikedPosts));
        setLikeCount(prev => Math.max(0, prev - 1));
        setLiked(false);
      } else {
        // Якщо пост ще не лайкнутий, додаємо лайк
        likedPosts.push(postId);
        localStorage.setItem("likedPosts", JSON.stringify(likedPosts));
        setLikeCount(prev => prev + 1);
        setLiked(true);
      }
      
      // Викликаємо колбек, якщо він є
      if (onLike) {
        onLike();
      }
    } catch (error) {
      console.error("Помилка при лайку:", error);
    }
  };

  const handleShareClick = () => {
    if (navigator.share && postId) {
      navigator.share({
        title: 'Перегляньте цей пост',
        text: 'Цікавий пост від спільноти B&C',
        url: `${window.location.origin}/post/${postId}`,
      })
        .then(() => console.log('Shared successfully'))
        .catch((error) => console.log('Error sharing:', error));
    } else {
      // Копіюємо посилання в буфер обміну
      const url = `${window.location.origin}/post/${postId}`;
      navigator.clipboard.writeText(url).then(
        () => {
          toast.success("Посилання скопійовано");
        },
        () => {
          toast.error("Не вдалося скопіювати посилання");
        }
      );
    }
  };

  return (
    <div className="flex items-center gap-4 mt-2">
      <Button 
        variant="ghost" 
        size="sm" 
        className={`flex items-center gap-1 ${liked ? 'text-red-500' : ''}`}
        onClick={handleLike}
      >
        <Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
        <span>{likeCount}</span>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-1"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{comments}</span>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-1 ml-auto"
        onClick={handleShareClick}
      >
        <Share2 className="h-4 w-4" />
        <span className="sr-only">Поділитися</span>
      </Button>
    </div>
  );
}
