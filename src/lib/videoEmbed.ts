// Регулярні вирази для різних платформ
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const INSTAGRAM_REGEX = /instagram\.com\/(?:p|reel)\/([^\/\s?]+)/;
const TIKTOK_REGEX = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
const FACEBOOK_REGEX = /facebook\.com\/(?:(?:watch\/?\?v=|reel\/|.*\/videos\/)(\d+)|share\/v\/([^\/\s?]+))/;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export interface VideoEmbed {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'link';
  videoId?: string;
  embedUrl?: string;
  originalUrl: string;
  thumbnailUrl?: string;
}

export function extractVideoEmbed(text: string): VideoEmbed | null {
  if (!text) return null;
  
  // Шукаємо URL в тексті
  const urlMatch = text.match(URL_REGEX);
  if (!urlMatch) return null;
  
  const url = urlMatch[0];
  
  // YouTube
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch && ytMatch[1]) {
    return {
      platform: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      originalUrl: url,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`
    };
  }
  
  // Instagram
  const igMatch = url.match(INSTAGRAM_REGEX);
  if (igMatch && igMatch[1]) {
    return {
      platform: 'instagram',
      videoId: igMatch[1],
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      originalUrl: url
    };
  }
  
  // TikTok
  const ttMatch = url.match(TIKTOK_REGEX);
  if (ttMatch && ttMatch[1]) {
    return {
      platform: 'tiktok',
      videoId: ttMatch[1],
      originalUrl: url
    };
  }
  
  // Facebook
  const fbMatch = url.match(FACEBOOK_REGEX);
  if (fbMatch && (fbMatch[1] || fbMatch[2])) {
    return {
      platform: 'facebook',
      videoId: fbMatch[1] || fbMatch[2],
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      originalUrl: url
    };
  }
  
  // Звичайне посилання
  return {
    platform: 'link',
    originalUrl: url
  };
}
