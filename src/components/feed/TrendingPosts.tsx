import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Flame, MessageSquare, Music, Video, ThumbsUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getDailyPostWindow, getPostExcerpt } from "@/lib/dailyPosts";
import { Button } from "@/components/ui/button";
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
      return rows.map(post => ({ ...post, groupName: groups?.find(g => g.id === post.group_id)?.name }));
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
            {posts.map((post, index) => {
              const image = post.media_url && /\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(post.media_url);
              const Icon = post.category === "music" ? Music : post.category === "video" ? Video : MessageSquare;
              return (
                <CarouselItem key={post.id} className="basis-[78%] pl-3 sm:basis-[48%]">
                  <Link to={`/post/${post.id}`} className="group flex h-52 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="relative h-24 shrink-0 overflow-hidden bg-muted">
                      {image && post.media_url ? (
                        <img src={post.media_url} alt="" loading="lazy" className="h-full w-full object-cover" onError={event => { event.currentTarget.hidden = true; }} />
                      ) : <div className="flex h-full items-center justify-center"><Icon className="h-8 w-8 text-muted-foreground" /></div>}
                      <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs font-semibold text-foreground">{index + 1}</span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
                      {post.groupName && <p className="truncate text-xs text-muted-foreground">{post.groupName}</p>}
                      <p className="line-clamp-2 break-words text-sm font-medium">{getPostExcerpt(post.content)}</p>
                      <span className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground"><ThumbsUp className="h-3.5 w-3.5" />{post.reaction_count}</span>
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        )}
      </Carousel>
    </section>
  );
}