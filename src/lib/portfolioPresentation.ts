export interface PortfolioMediaSource {
  media_type: string;
  media_url: string;
  media_preview_url?: string | null;
  media_display_url?: string | null;
}

export function getPortfolioMediaSources(item: PortfolioMediaSource) {
  return {
    playbackUrl: item.media_type === 'audio' ? item.media_url : (item.media_display_url || item.media_url),
    coverUrl: item.media_type === 'audio'
      ? (item.media_preview_url || item.media_display_url || null)
      : (item.media_preview_url || item.media_display_url || item.media_url),
  };
}

export const PORTFOLIO_MEDIA_ORDER = ['audio', 'video', 'photo'] as const;