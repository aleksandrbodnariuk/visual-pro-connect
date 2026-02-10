
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark, X } from "lucide-react";
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
import { CommentItem, CommentData } from "./CommentItem";
import { supabase } from "@/integrations/supabase/client";

export interface PostCardProps {
  id: string;
  author: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    profession?: string;
    isShareHolder?: boolean;
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

// Функція групування коментарів з відповідями
const groupCommentsWithReplies = (comments: CommentData[]): CommentData[] => {
  // Спочатку отримуємо кореневі коментарі (parent_id = null)
  const rootComments = comments.filter(c => !c.parent_id);
  
  // Рекурсивно додаємо відповіді до кожного коментаря
  const addReplies = (parentComment: CommentData): CommentData => {
    const directReplies = comments.filter(c => c.parent_id === parentComment.id);
    return {
      ...parentComment,
      replies: directReplies.map(reply => addReplies(reply))
    };
  };
  
  return rootComments.map(root => addReplies(root));
};

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
  const [allComments, setAllComments] = useState<CommentData[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingAllComments, setIsLoadingAllComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    userName: string;
  } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  
  const { getCurrentUser } = useAuthState();
  const authUser = currentUser || getCurrentUser();
  
  // Використовуємо хуки для лайків та репостів
  const { liked, likesCount, toggleLike, isLoading: likesLoading } = usePostLikes(id, likes);
  const { shared, toggleShare, isLoading: sharesLoading } = usePostShares(id);
  
  const isAuthor = authUser?.id === author.id;
  
  // Перевіряємо чи поточний користувач є інвестором (для показу титулів)
  const isCurrentUserInvestor = authUser?.isShareHolder || authUser?.is_shareholder;
  
  // Функція для видалення URL з тексту (для приватності)
  const removeUrls = (text: string | null | undefined): string => {
    if (!text) return '';
    return text.replace(/(https?:\/\/[^\s]+)/g, '').trim();
  };
  
  // Виявлення вбудованого відео/посилання
  const videoEmbed = extractVideoEmbed(caption);
  
  // Очищений текст без URL
  const cleanCaption = removeUrls(caption);

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
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: users } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: userIds });
        
        const commentsWithUsers: CommentData[] = commentsData.map(comment => ({
          ...comment,
          parent_id: (comment as any).parent_id || null,
          user: users?.find((u: any) => u.id === comment.user_id)
        }));
        
        // Групуємо коментарі з відповідями
        const grouped = groupCommentsWithReplies(commentsWithUsers);
        // Показуємо останні 2 кореневі коментарі
        setRecentComments(grouped.slice(-2));
      } else {
        setRecentComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  // Завантаження всіх коментарів для inline expand
  const loadAllComments = async () => {
    if (isLoadingAllComments || showAllComments) return;
    
    setIsLoadingAllComments(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: users } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: userIds });
        
        const commentsWithUsers: CommentData[] = commentsData.map(comment => ({
          ...comment,
          parent_id: (comment as any).parent_id || null,
          user: users?.find((u: any) => u.id === comment.user_id)
        }));
        
        // Групуємо коментарі з відповідями
        const grouped = groupCommentsWithReplies(commentsWithUsers);
        setAllComments(grouped);
        setShowAllComments(true);
      }
    } catch (error) {
      console.error("Error loading all comments:", error);
    } finally {
      setIsLoadingAllComments(false);
    }
  };

  // Фокус на поле коментаря
  const handleCommentFocus = () => {
    commentInputRef.current?.focus();
  };

  // Відповідь на коментар
  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    commentInputRef.current?.focus();
  };

  // Скасування відповіді
  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleCommentSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commentText.trim() && authUser?.id) {
      setIsSubmittingComment(true);
      try {
        const insertData: any = {
          post_id: id,
          user_id: authUser.id,
          content: commentText.trim()
        };
        
        // Додаємо parent_id якщо це відповідь
        if (replyingTo) {
          insertData.parent_id = replyingTo.commentId;
        }
        
        const { error } = await supabase.from('comments').insert(insertData);
        
        if (error) throw error;
        
        setCommentText("");
        setReplyingTo(null);
        // Перезавантажуємо коментарі
        loadRecentComments();
        if (showAllComments) {
          // Перезавантажуємо всі коментарі
          setShowAllComments(false);
          setTimeout(() => loadAllComments(), 100);
        }
      } catch (error) {
        console.error("Error submitting comment:", error);
      } finally {
        setIsSubmittingComment(false);
      }
    }
  };

  // Підрахунок загальної кількості коментарів (кореневих)
  const displayedComments = showAllComments ? allComments : recentComments;
  const totalRootComments = showAllComments ? allComments.length : comments;

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
            {/* Титули показуються тільки інвесторам (без @username - як у Facebook) */}
            {author.profession && isCurrentUserInvestor && (
              <span className={`profession-badge profession-badge-${author.profession.toLowerCase()} text-[10px]`}>
                {author.profession}
              </span>
            )}
          </div>
        </Link>
        <PostMenu 
          postId={id}
          isAuthor={isAuthor}
          onEdit={onEdit}
          onDelete={onDelete}
          caption={caption}
        />
      </div>

      {/* Зображення - показуємо тільки якщо є */}
      {imageUrl && (
        <div className="relative overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={caption}
            className="w-full object-contain max-h-[600px] transition-all hover:scale-105"
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
              onClick={handleCommentFocus}
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

        {/* Опис (без URL - для приватності) */}
        <div className="mt-1">
          <p className="text-sm">
            <Link to={`/profile/${author.id}`} className="font-semibold">
              {author.name}
            </Link>{" "}
            {cleanCaption || (videoEmbed ? '' : '')}
          </p>
        </div>

        {/* Inline коментарі з вкладеними відповідями */}
        {displayedComments.length > 0 && (
          <div className="mt-3 space-y-1">
            {displayedComments.map(comment => (
              <CommentItem 
                key={comment.id} 
                comment={comment}
                postAuthorId={author.id}
                onReply={handleReply}
              />
            ))}
          </div>
        )}

        {/* Кнопка "Переглянути більше коментарів" - inline expand */}
        <div className="mt-2 flex flex-col">
          {totalRootComments > 2 && !showAllComments && (
            <button 
              onClick={loadAllComments}
              disabled={isLoadingAllComments}
              className="text-sm text-muted-foreground hover:underline text-left"
            >
              {isLoadingAllComments 
                ? "Завантаження..." 
                : `Переглянути ще ${totalRootComments - Math.min(recentComments.length, 2)} коментарів`
              }
            </button>
          )}
          {showAllComments && allComments.length > 2 && (
            <button 
              onClick={() => setShowAllComments(false)}
              className="text-sm text-muted-foreground hover:underline text-left"
            >
              Згорнути коментарі
            </button>
          )}
          <span className="mt-1 text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {/* Inline форма коментаря */}
        {authUser && (
          <div className="mt-3 pt-3 border-t">
            {/* Показуємо кому відповідаємо */}
            {replyingTo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 bg-muted/30 rounded-lg px-3 py-1.5">
                <span>Відповідь для <strong>{replyingTo.userName}</strong></span>
                <button 
                  onClick={cancelReply} 
                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={authUser.avatar_url || ''} />
                <AvatarFallback>{authUser.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <Input
                ref={commentInputRef}
                placeholder={replyingTo ? `Відповісти ${replyingTo.userName}...` : "Написати коментар..."}
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
