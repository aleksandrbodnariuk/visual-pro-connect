import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReactionPicker, ReactionType, getReactionEmoji, getReactionLabel, getReactionColor } from "./ReactionPicker";
import { CommentLikesData } from "@/hooks/useFeedData";

export interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id?: string | null;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  replies?: CommentData[];
}

// Re-export FeedComment as CommentData for backward compat
export type { FeedComment } from "@/hooks/useFeedData";

interface CommentItemProps {
  comment: CommentData;
  depth?: number;
  postAuthorId: string;
  onReply: (commentId: string, userName: string) => void;
  /** Function to get likes data for a specific comment from batch */
  getLikes: (commentId: string) => CommentLikesData;
  /** Toggle reaction callback from batch hook */
  onToggleReaction: (commentId: string, reactionType: ReactionType) => void;
  /** Whether reaction toggle is loading */
  likesLoading?: boolean;
}

// Форматування часу
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'щойно';
  if (diffMins < 60) return `${diffMins} хв`;
  if (diffHours < 24) return `${diffHours} год`;
  if (diffDays < 7) return `${diffDays} дн`;
  
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
};

export function CommentItem({ comment, depth = 0, postAuthorId, onReply, getLikes, onToggleReaction, likesLoading = false }: CommentItemProps) {
  const isPostAuthor = comment.user_id === postAuthorId;
  const maxDepth = 2;
  
  const { userReaction, likesCount, topReactions } = getLikes(comment.id);

  const handleLikeClick = () => {
    onToggleReaction(comment.id, userReaction ? userReaction : 'like');
  };

  return (
    <div className={cn("flex items-start gap-2", depth > 0 && "ml-8 mt-1")}>
      <Link to={`/profile/${comment.user_id}`}>
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={comment.user?.avatar_url || ''} />
          <AvatarFallback className="text-xs">
            {comment.user?.full_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-2xl px-3 py-1 inline-block max-w-full text-sm [&>*]:leading-[1.1]">
          <Link to={`/profile/${comment.user_id}`} className="font-semibold text-xs hover:underline">
            {comment.user?.full_name || 'Користувач'}
          </Link>
          {isPostAuthor && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-1 align-middle">
              Автор
            </Badge>
          )}
          <br />
          <span className="break-words">{comment.content}</span>
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground px-1">
          <span>{formatTimeAgo(comment.created_at)}</span>
          <ReactionPicker onSelect={(type) => onToggleReaction(comment.id, type)} disabled={likesLoading}>
            <button 
              onClick={handleLikeClick}
              disabled={likesLoading}
              className={cn(
                "hover:underline transition-colors",
                userReaction 
                  ? `font-bold ${getReactionColor(userReaction)}` 
                  : "font-medium hover:text-foreground"
              )}
            >
              {userReaction ? getReactionLabel(userReaction) : 'Подобається'}
            </button>
          </ReactionPicker>
          {likesCount > 0 && (
            <span className="flex items-center gap-0.5">
              {topReactions.map((type, i) => (
                <span key={i} className="text-sm -ml-0.5 first:ml-0">{getReactionEmoji(type)}</span>
              ))}
              <span className="ml-0.5 text-muted-foreground">{likesCount}</span>
            </span>
          )}
          <button 
            onClick={() => onReply(comment.id, comment.user?.full_name || 'Користувач')}
            className="hover:underline font-medium hover:text-foreground transition-colors"
          >
            Відповісти
          </button>
        </div>
        
        {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
          <div className="mt-0.5">
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                depth={depth + 1}
                postAuthorId={postAuthorId}
                onReply={onReply}
                getLikes={getLikes}
                onToggleReaction={onToggleReaction}
                likesLoading={likesLoading}
              />
            ))}
          </div>
        )}
        
        {comment.replies && comment.replies.length > 0 && depth >= maxDepth && (
          <div className="mt-0.5">
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                depth={maxDepth}
                postAuthorId={postAuthorId}
                onReply={onReply}
                getLikes={getLikes}
                onToggleReaction={onToggleReaction}
                likesLoading={likesLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
