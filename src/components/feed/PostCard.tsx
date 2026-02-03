
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePostLikes } from "@/hooks/usePostLikes";
import { usePostShares } from "@/hooks/usePostShares";
import { PostMenu } from "@/components/profile/PostMenu";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { extractVideoEmbed } from "@/lib/videoEmbed";
import { VideoPreview } from "./VideoPreview";
import { supabase } from "@/integrations/supabase/client";

interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

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
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUser?: any;
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
  onEdit,
  onDelete,
  currentUser,
}: PostCardProps) {
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [recentComments, setRecentComments] = useState<CommentData[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const navigate = useNavigate();
  const { getCurrentUser } = useAuthState();
  const authUser = currentUser || getCurrentUser();
  
  // Використовуємо хуки для лайків та репостів
  const { liked, likesCount, toggleLike, isLoading: likesLoading } = usePostLikes(id, likes);
  const { shared, toggleShare, isLoading: sharesLoading } = usePostShares(id);
  
  const isAuthor = authUser?.id === author.id;
  
  // Виявлення вбудованого відео/посилання
  const videoEmbed = extractVideoEmbed(caption);

  // Завантаження останніх коментарів
  useEffect(() => {
    loadRecentComments();
  }, [id]);

  const loadRecentComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: users } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: userIds });
        
        const commentsWithUsers = commentsData.map(comment => ({
          ...comment,
          user: users?.find((u: any) => u.id === comment.user_id)
        }));
        
        setRecentComments(commentsWithUsers);
      } else {
        setRecentComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleCommentSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commentText.trim() && authUser?.id) {
      setIsSubmittingComment(true);
      try {
        const { error } = await supabase.from('comments').insert({
          post_id: id,
          user_id: authUser.id,
          content: commentText.trim()
        });
        
        if (error) throw error;
        
        setCommentText("");
        loadRecentComments();
      } catch (error) {
        console.error("Error submitting comment:", error);
      } finally {
        setIsSubmittingComment(false);
      }
    }
  };

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
        <PostMenu 
          postId={id}
          isAuthor={isAuthor}
          onEdit={onEdit}
          onDelete={onDelete}
        />
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

      {/* Вбудоване відео превʼю - показуємо тільки якщо немає зображення */}
      {!imageUrl && videoEmbed && (
        <div className="px-3 pt-2">
          <VideoPreview embed={videoEmbed} />
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => navigate(`/post/${id}`)}
            >
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

        {/* Inline коментарі */}
        {recentComments.length > 0 && (
          <div className="mt-2 space-y-2">
            {recentComments.slice(0, 2).map(comment => (
              <div key={comment.id} className="flex items-start gap-2">
                <Link to={`/profile/${comment.user_id}`}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.user?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">{comment.user?.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="bg-muted/50 rounded-2xl px-3 py-1.5 flex-1">
                  <Link to={`/profile/${comment.user_id}`} className="font-semibold text-xs hover:underline">
                    {comment.user?.full_name || 'Користувач'}
                  </Link>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Посилання на всі коментарі */}
        <div className="mt-1 flex flex-col">
          {comments > 2 && (
            <Link to={`/post/${id}`} className="text-sm text-muted-foreground hover:underline">
              Переглянути ще {comments - Math.min(recentComments.length, 2)} коментарів
            </Link>
          )}
          <span className="mt-1 text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {/* Inline форма коментаря */}
        {authUser && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={authUser.avatar_url || ''} />
                <AvatarFallback>{authUser.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <Input
                placeholder="Написати коментар..."
                className="flex-1 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleCommentSubmit}
                disabled={isSubmittingComment}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
