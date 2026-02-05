// Регулярні вирази для різних платформ
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const YOUTUBE_SHORTS_REGEX = /youtube\.com\/shorts\/([^"&?\/\s]{11})/;
const INSTAGRAM_REGEX = /instagram\.com\/(?:p|reel)\/([^\/\s?]+)/;
const TIKTOK_REGEX = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
const FACEBOOK_REEL_REGEX = /facebook\.com\/reel\/(\d+)/;
const FACEBOOK_SHARE_REEL_REGEX = /facebook\.com\/share\/v\/([^\/\s?]+)/;
const FACEBOOK_REGEX = /facebook\.com\/(?:(?:watch\/?\?v=|reel\/|.*\/videos\/)(\d+)|share\/v\/([^\/\s?]+))/;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export interface VideoEmbed {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'link';
  videoId?: string;
  embedUrl?: string;
  originalUrl: string;
  thumbnailUrl?: string;
  isVertical?: boolean;
}

export function extractVideoEmbed(text: string): VideoEmbed | null {
  if (!text) return null;
  
  // Шукаємо URL в тексті
  const urlMatch = text.match(URL_REGEX);
  if (!urlMatch) return null;
  
  const url = urlMatch[0];
  
  // YouTube Shorts (перевіряємо першим - вертикальне відео)
  const ytShortsMatch = url.match(YOUTUBE_SHORTS_REGEX);
  if (ytShortsMatch && ytShortsMatch[1]) {
    return {
      platform: 'youtube',
      videoId: ytShortsMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytShortsMatch[1]}`,
      originalUrl: url,
      thumbnailUrl: `https://img.youtube.com/vi/${ytShortsMatch[1]}/maxresdefault.jpg`,
      isVertical: true
    };
  }
  
  // YouTube
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch && ytMatch[1]) {
    return {
      platform: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      originalUrl: url,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`,
      isVertical: false
    };
  }
  
  // Instagram
  const igMatch = url.match(INSTAGRAM_REGEX);
  if (igMatch && igMatch[1]) {
    return {
      platform: 'instagram',
      videoId: igMatch[1],
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      originalUrl: url,
      isVertical: true
    };
  }
  
  // TikTok
  const ttMatch = url.match(TIKTOK_REGEX);
  if (ttMatch && ttMatch[1]) {
    return {
      platform: 'tiktok',
      videoId: ttMatch[1],
      originalUrl: url,
      isVertical: true
    };
  }
  
  // Facebook Reels (перевіряємо першим - вертикальне відео)
  const fbReelMatch = url.match(FACEBOOK_REEL_REGEX);
  if (fbReelMatch && fbReelMatch[1]) {
    return {
      platform: 'facebook',
      videoId: fbReelMatch[1],
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      originalUrl: url,
      isVertical: true
    };
  }
  
  // Facebook Share Reels (вертикальне відео)
  const fbShareReelMatch = url.match(FACEBOOK_SHARE_REEL_REGEX);
  if (fbShareReelMatch && fbShareReelMatch[1]) {
    return {
      platform: 'facebook',
      videoId: fbShareReelMatch[1],
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      originalUrl: url,
      isVertical: true
    };
  }
  
  // Facebook (звичайне горизонтальне відео)
  const fbMatch = url.match(FACEBOOK_REGEX);
  if (fbMatch && (fbMatch[1] || fbMatch[2])) {
    return {
      platform: 'facebook',
      videoId: fbMatch[1] || fbMatch[2],
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      originalUrl: url,
      isVertical: false
    };
  }
  
  // Звичайне посилання
  return {
    platform: 'link',
    originalUrl: url
  };
}
