import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Flame, MessageSquare, Music, Video, ThumbsUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getDailyPostWindow, getPostExcerpt } from "@/lib/dailyPosts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { extractVideoEmbed } from "@/lib/videoEmbed";
import { useEmbedThumbnail } from "@/hooks/useEmbedThumbnail";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export function TrendingPosts() {
  const { user } = useAuth();
  const { start, end } = getDailyPostWindow();
  const { data: posts = [], isPending, isError, refetch } = useQuery({
    queryKey: ["daily-popular-posts", user?.id, start],
    enabled: Boolean(user?.id),
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_popular_posts", {
        _day_start: start, _day_end: end,
      });
      if (error) throw error;
      const rows = data ?? [];
      const groupIds = [...new Set(rows.filter(p => p.posted_as_group && p.group_id).map(p => p.group_id))]
        .filter((id): id is string => Boolean(id));
      const { data: groups, error: groupError } = groupIds.length
        ? await supabase.from("groups").select("id, name").in("id", groupIds)
        : { data: [], error: null };
      if (groupError) throw groupError;
      const userIds = [...new Set(rows.filter(p => !p.posted_as_group).map(p => p.user_id))].filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase.rpc("get_safe_public_profiles_by_ids", { _ids: userIds })
        : { data: [] };
      return rows.map(post => {
        const author = !post.posted_as_group ? profiles?.find(u => u.id === post.user_id) : undefined;
        return {
          ...post,
          authorName: post.posted_as_group ? groups?.find(g => g.id === post.group_id)?.name : author?.full_name,
          authorAvatar: author?.avatar_url ?? null,
        };
      });
    },
  });

  return (
    <section aria-labelledby="trending-title" className="min-w-0 w-full">
      <Carousel opts={{ align: "start", dragFree: true }} aria-label="Актуальні публікації">
        <div className="mb-3 flex min-h-11 items-center justify-between gap-2">
          <h2 id="trending-title" className="flex items-center gap-2 text-base font-semibold">
            <Flame className="h-5 w-5 text-accent" />Актуальне
            <span className="text-xs font-normal text-muted-foreground">Сьогодні</span>
          </h2>
          {posts.length > 1 && (
            <div className="flex gap-1">
              <CarouselPrevious className="static h-11 w-11 translate-y-0" aria-label="Попередні актуальні дописи" title="Попередні дописи" />
              <CarouselNext className="static h-11 w-11 translate-y-0" aria-label="Наступні актуальні дописи" title="Наступні дописи" />
            </div>
          )}
        </div>
        {isPending ? (
          <div className="flex gap-3 overflow-hidden" aria-label="Завантаження актуальних дописів">
            {[0, 1, 2].map(i => <div key={i} className="h-48 w-52 shrink-0 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />)}
          </div>
        ) : isError ? (
          <div className="flex flex-wrap items-center gap-2 py-3 text-sm text-muted-foreground" role="status">
            Не вдалося завантажити актуальні дописи.
            <Button variant="outline" className="min-h-11" onClick={() => refetch()}>Спробувати ще</Button>
          </div>
        ) : posts.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Сьогодні ще немає публікацій із реакціями.</p>
        ) : (
          <CarouselContent className="-ml-3">
            {posts.map((post, index) => (
              <CarouselItem key={post.id} className="basis-[82%] pl-3 sm:basis-[48%] lg:basis-[40%]">
                <TrendingCard post={post} index={index} />
              </CarouselItem>
            ))}
          </CarouselContent>
        )}
      </Carousel>
    </section>
  );
}

type TrendingPost = { id: string; content: string; media_url: string | null; category: string | null; reaction_count: number; authorName?: string | null; authorAvatar?: string | null };

function TrendingCard({ post, index }: { post: TrendingPost; index: number }) {
  const isImage = Boolean(post.media_url && /\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(post.media_url));
  const embed = extractVideoEmbed(post.content || "");
  const thumb = useEmbedThumbnail(embed && embed.platform !== "link" ? embed : null);
  const cover = isImage ? post.media_url : thumb;
  const Icon = post.category === "music" ? Music : post.category === "video" || embed ? Video : MessageSquare;
  const text = getPostExcerpt(post.content);
  const name = post.authorName || "Учасник спільноти";
  return (
    <Link to={`/post/${post.id}`} className="group flex h-full min-h-56 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {cover ? (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted">
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
          {!isImage && <span className="absolute inset-0 flex items-center justify-center"><Video className="h-9 w-9 rounded-full bg-background/80 p-2 text-foreground" /></span>}
          <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs font-semibold text-foreground">{index + 1}</span>
        </div>
      ) : (
        <div className="relative flex flex-1 items-start gap-2 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-3 pt-10">
          <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs font-semibold text-foreground">{index + 1}</span>
          <Icon className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
          <p className="line-clamp-5 whitespace-pre-line break-words text-sm font-medium">{text || "Публікація без тексту"}</p>
        </div>
      )}
      <div className="flex flex-col gap-2 p-3">
        {cover && text && <p className="line-clamp-2 break-words text-sm font-medium">{text}</p>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-6 w-6">
            {post.authorAvatar && <AvatarImage src={post.authorAvatar} alt="" />}
            <AvatarFallback className="text-[10px]">{name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate">{name}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{post.reaction_count}</span>
        </div>
      </div>
    </Link>
  );
}
