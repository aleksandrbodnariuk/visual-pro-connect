
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { usePostLikes } from "@/hooks/usePostLikes";
import { Navbar } from "@/components/layout/Navbar";
import { extractVideoEmbed } from "@/lib/videoEmbed";
import { VideoPreview } from "@/components/feed/VideoPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Comment {
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

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string;
    title: string;
  };
}

export default function PostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { liked, likesCount, toggleLike } = usePostLikes(postId || "", post?.likes_count || 0);

  useEffect(() => {
    if (postId) {
      loadPost();
      loadComments();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_user_id_fkey(id, full_name, avatar_url, title)
        `)
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error("Error loading post:", error);
      toast({ title: "Помилка завантаження публікації", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: users } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: userIds });
        
        const commentsWithUsers = commentsData.map(comment => ({
          ...comment,
          user: users?.find((u: any) => u.id === comment.user_id)
        }));
        
        setComments(commentsWithUsers);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser?.id || !postId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      loadComments();
      toast({ title: "Коментар додано" });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({ title: "Помилка додавання коментаря", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
      toast({ title: "Коментар видалено" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({ title: "Помилка видалення коментаря", variant: "destructive" });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "щойно";
    if (diffMins < 60) return `${diffMins} хв тому`;
    if (diffHours < 24) return `${diffHours} год тому`;
    return `${diffDays} дн тому`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl mx-auto py-8 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl mx-auto py-8 px-4 text-center">
          <p className="text-muted-foreground">Публікацію не знайдено</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Повернутися
          </Button>
        </div>
      </div>
    );
  }

  const isAuthor = currentUser?.id === post.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>

        {/* Post */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Author info */}
            <div className="flex items-center justify-between mb-4">
              <Link to={`/profile/${post.author?.id}`} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={post.author?.avatar_url || ''} />
                  <AvatarFallback>{post.author?.full_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{post.author?.full_name || 'Користувач'}</p>
                  <p className="text-sm text-muted-foreground">{formatTimeAgo(post.created_at)}</p>
                </div>
              </Link>
            </div>

            {/* Content - очищаємо URL */}
            {post.content && (
              <p className="mb-4 text-foreground">
                {post.content.replace(/(https?:\/\/[^\s]+)/g, '').trim()}
              </p>
            )}
            
            {/* Video Preview - якщо є вбудоване відео */}
            {post.content && extractVideoEmbed(post.content) && !post.media_url && (
              <div className="mb-4">
                <VideoPreview embed={extractVideoEmbed(post.content)!} />
              </div>
            )}

            {/* Media */}
            {post.media_url && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img src={post.media_url} alt="Post media" className="w-full object-cover" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button variant="ghost" size="sm" onClick={toggleLike}>
                <Heart className={`h-5 w-5 mr-1 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likesCount}
              </Button>
              <Button variant="ghost" size="sm">
                <MessageCircle className="h-5 w-5 mr-1" />
                {comments.length}
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto">
                <Bookmark className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add comment */}
        {currentUser && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar_url || ''} />
                  <AvatarFallback>{currentUser.full_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Написати коментар..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <Button 
                      onClick={handleSubmitComment} 
                      disabled={!newComment.trim() || submitting}
                      size="sm"
                    >
                      {submitting ? "Надсилання..." : "Коментувати"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments list */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Коментарі ({comments.length})</h3>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Link to={`/profile/${comment.user_id}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user?.avatar_url || ''} />
                        <AvatarFallback>{comment.user?.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link to={`/profile/${comment.user_id}`} className="font-medium hover:underline">
                            {comment.user?.full_name || 'Користувач'}
                          </Link>
                          <span className="text-sm text-muted-foreground ml-2">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        {currentUser?.id === comment.user_id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Видалити коментар?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Цю дію неможливо скасувати.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Скасувати</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>
                                  Видалити
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      <p className="mt-1 text-foreground">{comment.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Поки немає коментарів. Будьте першим!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
