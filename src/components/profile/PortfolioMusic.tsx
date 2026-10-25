import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, MessageCircle, Pause, Play, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import vinyl from '@/assets/portfolio-vinyl.jpg';

export interface PortfolioTrack {
  id: string; title: string; url: string; coverUrl?: string | null;
  description?: string | null; authorId?: string; authorName?: string; authorAvatar?: string | null;
}
interface MusicState {
  track: PortfolioTrack | null; playing: boolean; loading: boolean; error: boolean;
  toggle: (track: PortfolioTrack) => void;
}
const MusicContext = createContext<MusicState | null>(null);

export function PortfolioMusicProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<PortfolioTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!track || !ref.current) return;
    setLoading(true);
    ref.current.play().catch(() => { setLoading(false); setPlaying(false); });
  }, [track]);
  const toggle = (next: PortfolioTrack) => {
    if (track?.id !== next.id) {
      ref.current?.pause(); setPlaying(false); setError(false); setTrack(next); return;
    }
    if (!ref.current) return;
    if (playing) ref.current.pause();
    else { setError(false); setLoading(true); ref.current.play().catch(() => setLoading(false)); }
  };
  return <MusicContext.Provider value={{ track, playing, loading, error, toggle }}>
    {children}
    {track && <div className="sticky bottom-0 z-20 mt-6 border-t border-border bg-background p-3 shadow-lg" aria-label="Плеєр портфоліо">
      <div className="flex items-center gap-3 min-w-0">
        <img src={track.coverUrl || vinyl} alt="" className="h-12 w-12 rounded object-cover shrink-0" width={48} height={48} />
        <div className="min-w-0 flex-1"><p className="font-medium break-words text-sm">{track.title}</p><p className="text-xs text-muted-foreground">{track.authorName}</p></div>
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Закрити плеєр" title="Закрити плеєр" onClick={() => { ref.current?.pause(); setTrack(null); setPlaying(false); }}><X /></Button>
      </div>
      <audio key={track.id} ref={ref} src={track.url} controls preload="metadata" className="mt-2 w-full h-10 portfolio-native-audio"
        onPlaying={() => { setPlaying(true); setLoading(false); }} onPause={() => { setPlaying(false); setLoading(false); }} onEnded={() => setPlaying(false)}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onError={() => { setError(true); setPlaying(false); setLoading(false); }} />
      {error && <p role="alert" className="text-sm text-destructive mt-2">Файл пісні недоступний. Автор має завантажити його повторно.</p>}
    </div>}
  </MusicContext.Provider>;
}

export function PortfolioAudioCard({ track, category, actions }: { track: PortfolioTrack; category: string; actions?: ReactNode }) {
  const music = useContext(MusicContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [track.coverUrl]);
  const active = music?.track?.id === track.id;
  const playing = active && music?.playing;
  const contact = () => {
    if (!user) { toast.error('Увійдіть у систему, щоб написати автору'); return; }
    if (!track.authorId || user.id === track.authorId) return;
    localStorage.setItem('currentChatReceiverId', track.authorId);
    navigate('/messages');
  };
  return <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
    <div className="relative aspect-square overflow-hidden bg-muted">
      <img src={!coverFailed && track.coverUrl ? track.coverUrl : vinyl} alt={`Обкладинка: ${track.title}`} onError={() => setCoverFailed(true)} loading="lazy" decoding="async" width={768} height={768} className="w-full h-full object-cover" />
      <div className="absolute top-3 left-3 bg-background/90 px-2 py-1 text-xs font-medium rounded">{category}</div>
      {actions && <div className="absolute top-2 right-2">{actions}</div>}
      <Button size="icon" className="absolute bottom-3 right-3 h-12 w-12 rounded-full" onClick={() => music?.toggle(track)} aria-label={`${playing ? 'Призупинити' : 'Відтворити'}: ${track.title}`} title={playing ? 'Призупинити' : 'Відтворити'}>
        {active && music?.loading ? <Loader2 className="animate-spin" /> : playing ? <Pause /> : <Play />}
      </Button>
    </div>
    <div className="p-4 space-y-3">
      <h4 className="font-semibold text-base break-words leading-snug">{track.title}</h4>
      {track.authorName && <div className="flex items-center gap-2 min-w-0"><Avatar className="h-6 w-6 shrink-0"><AvatarImage src={track.authorAvatar || undefined} /><AvatarFallback className="text-xs">{track.authorName[0]}</AvatarFallback></Avatar><span className="text-xs text-muted-foreground break-words">{track.authorName}</span></div>}
      {track.description && <p className="text-sm text-muted-foreground line-clamp-2 break-words">{track.description}</p>}
      <div className="flex h-5 items-center gap-1" aria-label={playing ? 'Звучить' : 'Музична композиція'}>
        {Array.from({ length: 18 }, (_, i) => <span key={i} className={`portfolio-meter-bar ${playing ? 'portfolio-meter-playing' : ''}`} />)}
      </div>
      {active && music?.error && <p className="text-xs text-destructive">Файл недоступний</p>}
      {track.authorId && user?.id !== track.authorId && <Button variant="outline" className="w-full h-auto min-h-11 whitespace-normal" onClick={contact}><MessageCircle />Замовити схожу пісню</Button>}
    </div>
  </article>;
}