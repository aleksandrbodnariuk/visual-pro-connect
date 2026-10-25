import type { ReactNode } from 'react';
import { Camera, Music, Play, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PORTFOLIO_MEDIA_ORDER } from '@/lib/portfolioPresentation';
import { PortfolioAudioCard, type PortfolioTrack } from './PortfolioMusic';

export interface CollectionItem extends PortfolioTrack {
  type: string; thumbnailUrl?: string | null;
}
const LABELS = { audio: 'Пісні та музика', video: 'Відео та кліпи', photo: 'Фотогалерея' };
const ICONS = { audio: Music, video: Video, photo: Camera };

export function PortfolioCollection({ items, category, onOpen, actions }: {
  items: CollectionItem[]; category: string; onOpen: (id: string) => void; actions?: (id: string) => ReactNode;
}) {
  return <div className="space-y-6">
    {PORTFOLIO_MEDIA_ORDER.map(type => {
      const collection = items.filter(item => item.type === type);
      if (!collection.length) return null;
      const Icon = ICONS[type];
      return <div key={type}>
        <h4 className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground"><Icon className="h-4 w-4" />{LABELS[type]}<span className="tabular-nums">· {collection.length}</span></h4>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-4">
          {collection.map(item => type === 'audio'
            ? <PortfolioAudioCard key={item.id} track={item} category={category} actions={actions?.(item.id)} />
            : <article key={item.id} className="min-w-0 rounded-lg border border-border overflow-hidden bg-card">
              <div className="relative">
                <Button variant="ghost" className={`relative w-full h-auto p-0 rounded-none overflow-hidden bg-muted hover:bg-muted ${type === 'video' ? 'aspect-video' : 'aspect-[4/3]'}`} onClick={() => onOpen(item.id)} aria-label={`Переглянути: ${item.title}`}>
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <Icon className="h-10 w-10 text-muted-foreground" />}
                  {type === 'video' && <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-background/90 text-foreground"><Play /></span></span>}
                </Button>
                {actions && <div className="absolute top-2 right-2">{actions(item.id)}</div>}
              </div>
              <div className="p-3"><h5 className="text-sm font-medium break-words">{item.title}</h5>{item.authorName && <p className="text-xs text-muted-foreground mt-1 break-words">{item.authorName}</p>}</div>
            </article>)}
        </div>
      </div>;
    })}
  </div>;
}