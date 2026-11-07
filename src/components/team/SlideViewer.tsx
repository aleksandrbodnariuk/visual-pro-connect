import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Maximize2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveSlideUrl } from '@/lib/slideUrl';

/** Одне зображення слайда: лоадер, 2 автоповтори, кнопка «Оновити слайд». */
function SlideImage({ src, alt }: { src: string; alt: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const url = attempt ? `${src}${src.includes('?') ? '&' : '?'}r=${attempt}` : src;
  const onError = () => {
    if (attempt < 2) setTimeout(() => setAttempt((a) => a + 1), 600 * (attempt + 1));
    else setState('error');
  };
  return (
    <div className="relative w-full min-h-[200px] bg-muted flex items-center justify-center">
      {state !== 'error' && (
        <img src={url} alt={alt} onLoad={() => setState('ok')} onError={onError} draggable={false}
          className={`w-full max-h-[85vh] object-contain transition-opacity ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`} />
      )}
      {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>}
      {state === 'error' && (
        <div className="p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Не вдалося показати слайд</p>
          <Button size="sm" variant="outline" onClick={() => { setState('loading'); setAttempt((a) => a + 1); }}>Оновити слайд</Button>
        </div>
      )}
    </div>
  );
}

/** Гортання слайдів: свайп, стрілки клавіатури, повний екран, поширення поточного слайда. */
export function SlideViewer({ slides, title }: { slides: string[]; title?: string }) {
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((d: number) => setI((x) => Math.min(n - 1, Math.max(0, x + d))), [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!box.current) return;
      const inView = document.fullscreenElement === box.current || box.current.matches(':hover');
      if (!inView) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);
  useEffect(() => { if (slides[i + 1]) new Image().src = resolveSlideUrl(slides[i + 1]); }, [i, slides]);

  const share = async () => {
    const url = new URL(resolveSlideUrl(slides[i]), window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: title || 'Слайд', url });
      else { await navigator.clipboard.writeText(url); toast.success('Посилання на слайд скопійовано'); }
    } catch { /* скасовано */ }
  };

  if (!n) return null;
  return (
    <div ref={box} className="relative bg-background rounded-md overflow-hidden select-none [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touch.current = null; }}>
      <SlideImage key={slides[i]} src={resolveSlideUrl(slides[i])} alt={`${title || 'Слайд'} ${i + 1}`} />
      <button aria-label="Попередній слайд" disabled={i === 0} onClick={() => go(-1)}
        className="absolute left-1 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/70 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="h-6 w-6" /></button>
      <button aria-label="Наступний слайд" disabled={i === n - 1} onClick={() => go(1)}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/70 flex items-center justify-center disabled:opacity-30"><ChevronRight className="h-6 w-6" /></button>
      <div className="flex items-center gap-2 p-2 bg-card">
        <span className="text-sm tabular-nums whitespace-nowrap shrink-0">{i + 1} / {n}</span>
        <input type="range" min={0} max={n - 1} value={i} onChange={(e) => setI(Number(e.target.value))} className="flex-1 min-w-0 accent-primary" aria-label="Перейти до слайда" />
        <Button size="sm" variant="ghost" className="shrink-0 h-10 px-2 sm:px-3" onClick={share} aria-label="Поділитися"><Share2 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Поділитися</span></Button>
        <Button size="icon" variant="ghost" aria-label="Повний екран"
          onClick={() => document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.()}><Maximize2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
