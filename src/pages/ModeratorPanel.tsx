import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Eye, Shield, MessageSquareWarning } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";

interface PostItem {
  id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  comments_count: number;
  likes_count: number;
}

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  user_name: string;
  user_avatar: string;
}

interface ModerationLog {
  id: string;
  action_type: string;
  reason: string;
  created_at: string;
  target_user_id: string;
  target_user_name?: string;
  moderator_name?: string;
}

export default function ModeratorPanel() {
  const navigate = useNavigate();
  const { user, appUser, loading } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [moderationLog, setModerationLog] = useState<ModerationLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Dialog states
  const [deletePostDialog, setDeletePostDialog] = useState<PostItem | null>(null);
  const [deleteCommentDialog, setDeleteCommentDialog] = useState<CommentItem | null>(null);
  const [warningDialog, setWarningDialog] = useState<{ userId: string; userName: string } | null>(null);
  const [reason, setReason] = useState("");

  // Check moderator role
  useEffect(() => {
    if (loading || !user) return;
    const check = async () => {
      const [modRes, adminRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' as any }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any }),
      ]);
      const hasAccess = modRes.data === true || adminRes.data === true || appUser?.founder_admin === true;
      setIsModerator(hasAccess);
      setCheckingRole(false);
    };
    check();
  }, [user, loading, appUser]);

  // Load data
  useEffect(() => {
    if (!isModerator || checkingRole) return;
    loadPosts();
    loadComments();
    loadModerationLog();
  }, [isModerator, checkingRole]);

  const loadPosts = async () => {
    setLoadingData(true);
    const { data } = await supabase
      .from('posts')
      .select('id, content, media_url, created_at, user_id, comments_count, likes_count')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: userIds as string[] });
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setPosts(data.map(p => {
        const profile = profileMap.get(p.user_id) as any;
        return {
          ...p,
          user_name: profile?.full_name || 'Невідомий',
          user_avatar: profile?.avatar_url || '',
        };
      }));
    }
    setLoadingData(false);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, post_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: userIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setComments(data.map(c => {
        const profile = profileMap.get(c.user_id) as any;
        return {
          ...c,
          user_name: profile?.full_name || 'Невідомий',
          user_avatar: profile?.avatar_url || '',
        };
      }));
    }
  };

  const loadModerationLog = async () => {
    const { data } = await supabase
      .from('moderation_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      const userIds = [...new Set([
        ...data.map(a => a.target_user_id),
        ...data.map(a => a.moderator_id),
      ])];
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: userIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setModerationLog(data.map(a => ({
        ...a,
        target_user_name: (profileMap.get(a.target_user_id) as any)?.full_name || 'Невідомий',
        moderator_name: (profileMap.get(a.moderator_id) as any)?.full_name || 'Модератор',
      })));
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostDialog || !reason.trim()) {
      toast.error("Вкажіть причину видалення");
      return;
    }
    // Log moderation action
    await supabase.from('moderation_actions').insert({
      moderator_id: user!.id,
      target_user_id: deletePostDialog.user_id,
      action_type: 'post_deleted',
      reason: reason.trim(),
      post_id: deletePostDialog.id,
    });
    // Send notification to user
    await supabase.from('notifications').insert({
      user_id: deletePostDialog.user_id,
      message: `⚠️ Вашу публікацію було видалено модератором. Причина: ${reason.trim()}`,
      is_read: false,
    });
    // Delete the post
    const { error } = await supabase.from('posts').delete().eq('id', deletePostDialog.id);
    if (error) {
      toast.error("Помилка видалення публікації");
    } else {
      toast.success("Публікацію видалено");
      setPosts(prev => prev.filter(p => p.id !== deletePostDialog.id));
      loadModerationLog();
    }
    setDeletePostDialog(null);
    setReason("");
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentDialog || !reason.trim()) {
      toast.error("Вкажіть причину видалення");
      return;
    }
    await supabase.from('moderation_actions').insert({
      moderator_id: user!.id,
      target_user_id: deleteCommentDialog.user_id,
      action_type: 'comment_deleted',
      reason: reason.trim(),
      comment_id: deleteCommentDialog.id,
    });
    await supabase.from('notifications').insert({
      user_id: deleteCommentDialog.user_id,
      message: `⚠️ Ваш коментар було видалено модератором. Причина: ${reason.trim()}`,
      is_read: false,
    });
    const { error } = await supabase.from('comments').delete().eq('id', deleteCommentDialog.id);
    if (error) {
      toast.error("Помилка видалення коментаря");
    } else {
      toast.success("Коментар видалено");
      setComments(prev => prev.filter(c => c.id !== deleteCommentDialog.id));
      loadModerationLog();
    }
    setDeleteCommentDialog(null);
    setReason("");
  };

  const handleSendWarning = async () => {
    if (!warningDialog || !reason.trim()) {
      toast.error("Вкажіть причину попередження");
      return;
    }
    await supabase.from('moderation_actions').insert({
      moderator_id: user!.id,
      target_user_id: warningDialog.userId,
      action_type: 'warning',
      reason: reason.trim(),
    });
    await supabase.from('notifications').insert({
      user_id: warningDialog.userId,
      message: `⚠️ Попередження від модератора: ${reason.trim()}`,
      is_read: false,
    });
    toast.success("Попередження надіслано");
    setWarningDialog(null);
    setReason("");
    loadModerationLog();
  };

  if (loading || checkingRole) {
    return <div className="container py-16 text-center">Завантаження...</div>;
  }

  if (!user || !isModerator) {
    navigate("/");
    return null;
  }

  const actionLabel = (type: string) => {
    switch (type) {
      case 'warning': return { text: 'Попередження', variant: 'outline' as const };
      case 'post_deleted': return { text: 'Пост видалено', variant: 'destructive' as const };
      case 'comment_deleted': return { text: 'Коментар видалено', variant: 'secondary' as const };
      default: return { text: type, variant: 'outline' as const };
    }
  };

  return (
    <div className="min-h-screen pt-14 sm:pt-16 3xl:pt-20 pb-safe-nav">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Панель модератора</h1>
            <p className="text-sm text-muted-foreground">Управління контентом та модерація</p>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="posts">Публікації</TabsTrigger>
            <TabsTrigger value="comments">Коментарі</TabsTrigger>
            <TabsTrigger value="log">Журнал дій</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <div className="space-y-3">
              {loadingData ? (
                <p className="text-center text-muted-foreground py-8">Завантаження...</p>
              ) : posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Публікації відсутні</p>
              ) : posts.map(post => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={post.user_avatar} />
                        <AvatarFallback>{post.user_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{post.user_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: uk })}
                          </span>
                        </div>
                        <p className="text-sm mt-1 line-clamp-3">{post.content || '(Без тексту)'}</p>
                        {post.media_url && (
                          <Badge variant="outline" className="mt-1 text-xs">📷 Медіа</Badge>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>❤️ {post.likes_count}</span>
                          <span>💬 {post.comments_count}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/post/${post.id}`)}
                          title="Переглянути"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-500 hover:text-amber-600"
                          onClick={() => setWarningDialog({ userId: post.user_id, userName: post.user_name })}
                          title="Попередження"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletePostDialog(post)}
                          title="Видалити"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Коментарі відсутні</p>
              ) : comments.map(comment => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={comment.user_avatar} />
                        <AvatarFallback>{comment.user_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{comment.user_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at!), { addSuffix: true, locale: uk })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-xs"
                          onClick={() => navigate(`/post/${comment.post_id}`)}
                        >
                          Переглянути пост →
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-500 hover:text-amber-600"
                          onClick={() => setWarningDialog({ userId: comment.user_id, userName: comment.user_name })}
                          title="Попередження"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteCommentDialog(comment)}
                          title="Видалити"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Moderation Log Tab */}
          <TabsContent value="log">
            <div className="space-y-3">
              {moderationLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Журнал дій порожній</p>
              ) : moderationLog.map(log => {
                const label = actionLabel(log.action_type);
                return (
                  <Card key={log.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={label.variant}>{label.text}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: uk })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            <span className="font-medium">{log.moderator_name}</span>
                            {' → '}
                            <span className="font-medium">{log.target_user_name}</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{log.reason}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Post Dialog */}
      <Dialog open={!!deletePostDialog} onOpenChange={() => { setDeletePostDialog(null); setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Видалити публікацію
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Публікація користувача <strong>{deletePostDialog?.user_name}</strong> буде видалена, а користувач отримає сповіщення.
          </p>
          <Textarea
            placeholder="Вкажіть причину видалення..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletePostDialog(null); setReason(""); }}>Скасувати</Button>
            <Button variant="destructive" onClick={handleDeletePost} disabled={!reason.trim()}>Видалити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Comment Dialog */}
      <Dialog open={!!deleteCommentDialog} onOpenChange={() => { setDeleteCommentDialog(null); setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Видалити коментар
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Коментар користувача <strong>{deleteCommentDialog?.user_name}</strong> буде видалено, а користувач отримає сповіщення.
          </p>
          <Textarea
            placeholder="Вкажіть причину видалення..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteCommentDialog(null); setReason(""); }}>Скасувати</Button>
            <Button variant="destructive" onClick={handleDeleteComment} disabled={!reason.trim()}>Видалити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog open={!!warningDialog} onOpenChange={() => { setWarningDialog(null); setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-amber-500" />
              Попередження користувачу
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Користувач <strong>{warningDialog?.userName}</strong> отримає сповіщення з попередженням.
          </p>
          <Textarea
            placeholder="Опишіть причину попередження..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWarningDialog(null); setReason(""); }}>Скасувати</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSendWarning} disabled={!reason.trim()}>
              Надіслати попередження
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
