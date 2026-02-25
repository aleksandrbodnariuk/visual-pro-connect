import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ReactionPicker, ReactionType, getReactionEmoji, getReactionLabel, getReactionColor } from "./ReactionPicker";
import { CommentLikesData } from "@/hooks/useFeedData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export type { FeedComment } from "@/hooks/useFeedData";

interface CommentItemProps {
  comment: CommentData;
  depth?: number;
  postAuthorId: string;
  currentUserId?: string;
  onReply: (commentId: string, userName: string) => void;
  getLikes: (commentId: string) => CommentLikesData;
  onToggleReaction: (commentId: string, reactionType: ReactionType) => void;
  onEditComment?: (commentId: string, newContent: string) => void;
  onDeleteComment?: (commentId: string) => void;
  likesLoading?: boolean;
}

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

export function CommentItem({ comment, depth = 0, postAuthorId, currentUserId, onReply, getLikes, onToggleReaction, onEditComment, onDeleteComment, likesLoading = false }: CommentItemProps) {
  const isPostAuthor = comment.user_id === postAuthorId;
  const isOwnComment = currentUserId === comment.user_id;
  const maxDepth = 2;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const { userReaction, likesCount, topReactions } = getLikes(comment.id);

  const handleLikeClick = () => {
    onToggleReaction(comment.id, userReaction ? userReaction : 'like');
  };

  const handleEditSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== comment.content && onEditComment) {
      onEditComment(comment.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') { setIsEditing(false); setEditText(comment.content); }
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
        <div className="group/comment relative inline-block max-w-full">
          <div className="bg-muted/50 rounded-2xl px-3 py-1 text-sm [&>*]:leading-[1.1]">
            <Link to={`/profile/${comment.user_id}`} className="font-semibold text-xs hover:underline">
              {comment.user?.full_name || 'Користувач'}
            </Link>
            {isPostAuthor && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-1 align-middle">
                Автор
              </Badge>
            )}
            <br />
            {isEditing ? (
              <div className="flex items-center gap-1 my-1">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="h-7 text-sm"
                  autoFocus
                />
                <button onClick={handleEditSave} className="text-primary hover:text-primary/80 p-0.5">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => { setIsEditing(false); setEditText(comment.content); }} className="text-muted-foreground hover:text-destructive p-0.5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="break-words">{comment.content}</span>
            )}
          </div>
          
          {/* Three-dot menu — only for own comments */}
          {isOwnComment && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="absolute -right-7 top-1 opacity-0 group-hover/comment:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[140px]">
                <DropdownMenuItem onClick={() => { setEditText(comment.content); setIsEditing(true); }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Редагувати
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeleteComment?.(comment.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Видалити
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                currentUserId={currentUserId}
                onReply={onReply}
                getLikes={getLikes}
                onToggleReaction={onToggleReaction}
                onEditComment={onEditComment}
                onDeleteComment={onDeleteComment}
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
                currentUserId={currentUserId}
                onReply={onReply}
                getLikes={getLikes}
                onToggleReaction={onToggleReaction}
                onEditComment={onEditComment}
                onDeleteComment={onDeleteComment}
                likesLoading={likesLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
