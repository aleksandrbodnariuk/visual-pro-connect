
import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Share2, Bookmark, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PostMenu } from "@/components/profile/PostMenu";
import { extractVideoEmbed } from "@/lib/videoEmbed";
import { VideoPreview } from "./VideoPreview";
import { AudioPlayer } from "./AudioPlayer";
import { CommentItem } from "./CommentItem";
import { supabase } from "@/integrations/supabase/client";
import { ReactionPicker, ReactionType, getReactionEmoji } from "./ReactionPicker";
import { FeedComment, CommentLikesData, PostLikesData, PostShareData } from "@/hooks/useFeedData";

// Функція групування коментарів з відповідями
const groupCommentsWithReplies = (comments: FeedComment[]): FeedComment[] => {
  const rootComments = comments.filter(c => !c.parent_id);
  const addReplies = (parentComment: FeedComment): FeedComment => {
    const directReplies = comments.filter(c => c.parent_id === parentComment.id);
    return { ...parentComment, replies: directReplies.map(reply => addReplies(reply)) };
  };
  return rootComments.map(root => addReplies(root));
};

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
  // Centralized data from NewsFeed
  feedComments?: FeedComment[];
  postLikesData?: PostLikesData;
  getCommentLikes?: (commentId: string) => CommentLikesData;
  onTogglePostReaction?: (postId: string, reaction: ReactionType) => void;
  onToggleCommentReaction?: (commentId: string, reaction: ReactionType) => void;
  onEditComment?: (commentId: string, newContent: string) => void;
  onDeleteComment?: (commentId: string) => void;
  postLikeLoading?: boolean;
  commentLikeLoading?: boolean;
  postShareData?: PostShareData;
  onToggleShare?: (postId: string) => void;
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
  feedComments = [],
  postLikesData,
  getCommentLikes,
  onTogglePostReaction,
  onToggleCommentReaction,
  onEditComment,
  onDeleteComment,
  postLikeLoading = false,
  commentLikeLoading = false,
  postShareData,
  onToggleShare,
}: PostCardProps) {
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const authUser = currentUser;
  const isAuthor = authUser?.id === author.id;
  const isCurrentUserInvestor = authUser?.isShareHolder || authUser?.is_shareholder;

  // Post likes from centralized data
  const liked = postLikesData?.liked || false;
  const likesCount = postLikesData?.likesCount ?? likes;
  const reactionType = postLikesData?.reactionType || null;
  const topReactions = postLikesData?.topReactions || [];
  const likerNames = postLikesData?.likerNames || [];
  const currentUserLiked = postLikesData?.currentUserLiked || false;

  const shared = postShareData?.shared || false;
  const sharesLoading = postShareData?.isLoading || false;
  const sharesCount = postShareData?.sharesCount || 0;
  const handleToggleShare = () => { if (onToggleShare) onToggleShare(id); };

  const removeUrls = (text: string | null | undefined): string => {
    if (!text) return '';
    return text.replace(/(https?:\/\/[^\s]+)/g, '').trim();
  };

  const videoEmbed = extractVideoEmbed(caption);
  const isAudioUrl = imageUrl && /\.(mp3|wav|ogg|flac|aac|m4a|wma)(\?|$)/i.test(imageUrl);
  const cleanCaption = removeUrls(caption);

  // Group comments with replies from centralized data
  const groupedComments = useMemo(() => groupCommentsWithReplies(feedComments), [feedComments]);
  const displayedComments = showAllComments ? groupedComments : groupedComments.slice(-2);
  const totalRootComments = groupedComments.length;

  const defaultGetCommentLikes = (cid: string): CommentLikesData => ({ likesCount: 0, userReaction: null, topReactions: [], likerNames: [] });
  const actualGetCommentLikes = getCommentLikes || defaultGetCommentLikes;
  const actualToggleCommentReaction = onToggleCommentReaction || (() => {});

  const handleCommentFocus = () => commentInputRef.current?.focus();
  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    commentInputRef.current?.focus();
  };
  const cancelReply = () => setReplyingTo(null);

  const handleToggleLike = () => {
    if (onTogglePostReaction) onTogglePostReaction(id, reactionType || 'like');
  };

  const handleToggleReaction = (reaction: ReactionType) => {
    if (onTogglePostReaction) onTogglePostReaction(id, reaction);
  };

  const handleCommentSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commentText.trim() && authUser?.id) {
      setIsSubmittingComment(true);
      try {
        const insertData: any = { post_id: id, user_id: authUser.id, content: commentText.trim() };
        if (replyingTo) insertData.parent_id = replyingTo.commentId;
        const { error } = await supabase.from('comments').insert(insertData);
        if (error) throw error;
        setCommentText("");
        setReplyingTo(null);
        // Realtime will handle refresh via centralized hook
      } catch (error) {
        console.error("Error submitting comment:", error);
      } finally {
        setIsSubmittingComment(false);
      }
    }
  };

  return (
    <div className={cn("creative-card card-hover", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <Link to={`/profile/${author.id}`} className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={author.avatarUrl} alt={author.name} />
            <AvatarFallback>{author.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{author.name}</span>
            {author.profession && isCurrentUserInvestor && (
              <span className={`profession-badge profession-badge-${author.profession.toLowerCase()} text-[10px]`}>
                {author.profession}
              </span>
            )}
          </div>
        </Link>
      <PostMenu postId={id} isAuthor={isAuthor} onEdit={onEdit} onDelete={onDelete} caption={caption} />
      </div>

      {/* Media first (Facebook-style) */}
      {isAudioUrl && imageUrl && (
        <div className="px-3 pt-2"><AudioPlayer src={imageUrl} /></div>
      )}

      {imageUrl && !isAudioUrl && (
        <div className="relative overflow-hidden bg-muted">
          <img src={imageUrl} alt={caption} loading="lazy" className="w-full object-contain max-h-[600px] transition-all hover:scale-105" />
        </div>
      )}

      {!imageUrl && !isAudioUrl && videoEmbed && (
        <div className="px-3 pt-2"><VideoPreview embed={videoEmbed} /></div>
      )}

      {/* Caption below media with truncation */}
      {cleanCaption && (
        <div className="px-3 pt-2 pb-1">
          <p className={cn("text-sm whitespace-pre-wrap", !showFullCaption && cleanCaption.length > 200 && "line-clamp-3")}>
            {cleanCaption}
          </p>
          {cleanCaption.length > 200 && !showFullCaption && (
            <button onClick={() => setShowFullCaption(true)} className="text-sm font-semibold text-muted-foreground hover:underline mt-0.5">
              Показати більше
            </button>
          )}
          {cleanCaption.length > 200 && showFullCaption && (
            <button onClick={() => setShowFullCaption(false)} className="text-sm font-semibold text-muted-foreground hover:underline mt-0.5">
              Згорнути
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReactionPicker onSelect={handleToggleReaction} disabled={postLikeLoading}>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={handleToggleLike} disabled={postLikeLoading}>
                {liked ? (
                  <span className="text-xl leading-none">{getReactionEmoji(reactionType || 'like')}</span>
                ) : (
                  <span className="text-xl leading-none opacity-60">👍</span>
                )}
              </Button>
            </ReactionPicker>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleCommentFocus}>
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleToggleShare} disabled={sharesLoading}>
              <Share2 className={cn("h-5 w-5 transition-all", shared && "fill-primary text-primary")} />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSaved(!saved)}>
            <Bookmark className={cn("h-5 w-5", saved && "fill-secondary text-secondary")} />
          </Button>
        </div>

        {/* Facebook-style summary bar */}
        {(likesCount > 0 || totalRootComments > 0 || sharesCount > 0) && (
          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
            {/* Left: reactions + who liked */}
            {likesCount > 0 ? (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {topReactions.length > 0 && topReactions.map((type, i) => (
                  <span key={i} className="text-sm -ml-0.5 first:ml-0">{getReactionEmoji(type as ReactionType)}</span>
                ))}
                <span className="truncate ml-0.5">
                  {(() => {
                    const parts: string[] = [];
                    if (currentUserLiked) parts.push('Ви');
                    likerNames.forEach(n => parts.push(n));
                    const shown = parts.length;
                    const remaining = likesCount - shown;
                    if (shown === 0 && remaining > 0) return `${remaining}`;
                    if (remaining > 0) return `${parts.join(', ')} та ще ${remaining}`;
                    return parts.join(', ');
                  })()}
                </span>
              </div>
            ) : <div />}
            {/* Right: comments + shares count */}
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {totalRootComments > 0 && (
                <span>{totalRootComments} коментарів</span>
              )}
              {sharesCount > 0 && (
                <span>{sharesCount} поширень</span>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        {displayedComments.length > 0 && (
          <div className="mt-3 space-y-1">
            {displayedComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postAuthorId={author.id}
                currentUserId={authUser?.id}
                onReply={handleReply}
                getLikes={actualGetCommentLikes}
                onToggleReaction={actualToggleCommentReaction}
                onEditComment={onEditComment}
                onDeleteComment={onDeleteComment}
                likesLoading={commentLikeLoading}
              />
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-col">
          {totalRootComments > 2 && !showAllComments && (
            <button onClick={() => setShowAllComments(true)} className="text-sm text-muted-foreground hover:underline text-left">
              Переглянути ще {totalRootComments - Math.min(displayedComments.length, 2)} коментарів
            </button>
          )}
          {showAllComments && groupedComments.length > 2 && (
            <button onClick={() => setShowAllComments(false)} className="text-sm text-muted-foreground hover:underline text-left">
              Згорнути коментарі
            </button>
          )}
          <span className="mt-1 text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {authUser && (
          <div className="mt-3 pt-3 border-t">
            {replyingTo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 bg-muted/30 rounded-lg px-3 py-1.5">
                <span>Відповідь для <strong>{replyingTo.userName}</strong></span>
                <button onClick={cancelReply} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={authUser.avatar_url || authUser.avatarUrl || ''} />
                <AvatarFallback>{authUser.full_name?.[0] || authUser.firstName?.[0] || 'U'}</AvatarFallback>
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
