import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { usePostLikes } from "@/hooks/usePostLikes";
import { ReactionPicker, getReactionEmoji } from "@/components/feed/ReactionPicker";
import { CommentInput } from "@/components/feed/CommentInput";
import { toast } from "@/hooks/use-toast";

export interface ViewerPhoto {
  id: string;
  media_url: string;
  /** true when the photo is a post (supports reactions/comments) */
  isPost: boolean;
}

interface Props {
  photos: ViewerPhoto[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
}

const timeAgo = (s: string) => {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "щойно";
  if (m < 60) return `${m} хв тому`;
  if (m < 1440) return `${Math.floor(m / 60)} год тому`;
  return `${Math.floor(m / 1440)} дн тому`;
};

function PostPanel({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const { liked, likesCount, toggleLike, toggleReaction, reactionType } = usePostLikes(postId, post?.likes_count || 0);

  const loadComments = useCallback(async () => {
    const { data } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    const ids = [...new Set((data || []).map((c) => c.user_id))];
    const { data: users } = ids.length ? await supabase.rpc("get_safe_public_profiles_by_ids", { _ids: ids }) : { data: [] as any[] };
    setComments((data || []).map((c) => ({ ...c, user: (users as any[])?.find((u) => u.id === c.user_id) })));
  }, [postId]);

  useEffect(() => {
    setPost(null);
    setComments([]);
    supabase.from("posts").select("*, author:users!posts_user_id_fkey(id, full_name, avatar_url)").eq("id", postId).maybeSingle()
      .then(({ data }) => setPost(data));
    loadComments();
  }, [postId, loadComments]);

  const submit = async (text: string, imageUrl?: string) => {
    if ((!text && !imageUrl) || !user?.id) return;
    if (text.length > 2000) { toast({ title: "Коментар не може перевищувати 2000 символів", variant: "destructive" }); return; }
    const row: any = { post_id: postId, user_id: user.id, content: text };
    if (imageUrl) row.image_url = imageUrl;
    const { error } = await supabase.from("comments").insert(row);
    if (error) { toast({ title: "Помилка додавання коментаря", variant: "destructive" }); return; }
    loadComments();
  };

  const caption = post?.content?.replace(/(https?:\/\/[^\s]+)/g, "").trim();

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center gap-3 border-b p-4">
        <Link to={`/profile/${post?.author?.id || ""}`} className="flex items-center gap-3 min-w-0">
          <Avatar><AvatarImage src={post?.author?.avatar_url || ""} /><AvatarFallback>{post?.author?.full_name?.[0] || "U"}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{post?.author?.full_name || "…"}</p>
            {post && <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>}
          </div>
        </Link>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {caption && <p className="whitespace-pre-wrap text-sm">{caption}</p>}
        <div className="flex items-center gap-2 border-y py-2">
          <ReactionPicker onSelect={(t) => toggleReaction(t)}>
            <Button variant="ghost" size="sm" className="gap-2" onClick={toggleLike}>
              <span className={liked ? "text-lg" : "text-lg opacity-60"}>{getReactionEmoji(liked ? reactionType || "like" : "like")}</span>
              {likesCount > 0 && <span>{likesCount}</span>}
            </Button>
          </ReactionPicker>
          <span className="ml-auto text-sm text-muted-foreground">{comments.length} коментарів</span>
        </div>
        {comments.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Поки немає коментарів. Будьте першим!</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-8 w-8"><AvatarImage src={c.user?.avatar_url || ""} /><AvatarFallback>{c.user?.full_name?.[0] || "U"}</AvatarFallback></Avatar>
            <div className="min-w-0">
              <div className="rounded-xl bg-muted/50 px-3 py-1.5">
                <p className="text-sm font-semibold">{c.user?.full_name || "Користувач"}</p>
                {c.content && <p className="text-sm break-words">{c.content}</p>}
              </div>
              {c.image_url && <img src={c.image_url} alt="Зображення коментаря" className="mt-1 max-h-48 rounded-xl border" />}
              <p className="px-1 text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
      {user && (
        <div className="border-t p-3">
          <CommentInput currentUser={user as any} onSubmit={submit} placeholder="Написати коментар..." />
        </div>
      )}
    </div>
  );
}

export function PhotoViewer({ photos, index, onIndexChange }: Props) {
  const touchX = useRef<number | null>(null);
  const open = index !== null && !!photos[index];
  const photo = open ? photos[index!] : null;
  const prev = useCallback(() => { if (index !== null && index > 0) onIndexChange(index - 1); }, [index, onIndexChange]);
  const next = useCallback(() => { if (index !== null && index < photos.length - 1) onIndexChange(index + 1); }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-none p-0 sm:rounded-none [&>button]:hidden">
        <DialogTitle className="sr-only">Перегляд фото</DialogTitle>
        {photo && (
          <div className="flex h-full min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <div
              className="relative flex min-h-[55dvh] flex-1 items-center justify-center bg-background lg:min-h-0"
              onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (dx > 50) prev();
                if (dx < -50) next();
              }}
            >
              <img key={photo.id} src={photo.media_url} alt="Фото" className="max-h-[55dvh] max-w-full select-none object-contain animate-fade-in lg:max-h-[100dvh]" draggable={false} />
              <Button variant="secondary" size="icon" className="absolute left-3 top-3 h-11 w-11 rounded-full" onClick={() => onIndexChange(null)} aria-label="Закрити">
                <X className="h-5 w-5" />
              </Button>
              {index! > 0 && (
                <Button variant="secondary" size="icon" className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full" onClick={prev} aria-label="Попереднє фото">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {index! < photos.length - 1 && (
                <Button variant="secondary" size="icon" className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full" onClick={next} aria-label="Наступне фото">
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                {index! + 1} з {photos.length}
              </div>
            </div>
            {photo.isPost && (
              <div className="w-full border-t lg:h-full lg:w-[380px] lg:border-l lg:border-t-0">
                <PostPanel postId={photo.id} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
