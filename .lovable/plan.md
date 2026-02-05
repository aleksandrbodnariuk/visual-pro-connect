

## План: Виправлення превʼю відео для повного кадру без обрізання

---

### Виявлена проблема

На скріншотах видно:
- **Оригінальне відео (Facebook)**: Вертикальний формат (приблизно 9:16), музиканти видно повністю
- **У нас на сайті**: Відео обрізане горизонтально (16:9), музикантів видно лише частково

**Технічна причина:**
```text
ЗАРАЗ (VideoPreview.tsx):
┌─────────────────────────────────────────────────────────────────────────────┐
│ <div className="aspect-video">  ← Фіксує 16:9 для ВСІХ відео               │
│   <iframe ... className="w-full h-full" />                                  │
│ </div>                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Результат: Вертикальне відео (9:16) втискується в 16:9 контейнер → обрізання
```

---

### Проблема з різними платформами

| Платформа | Формат відео | Рішення |
|-----------|--------------|---------|
| YouTube (звичайне) | 16:9 горизонтальне | `aspect-video` ОК |
| YouTube Shorts | 9:16 вертикальне | Потрібен інший aspect-ratio |
| Facebook Watch | 16:9 горизонтальне | `aspect-video` ОК |
| Facebook Reels | 9:16 вертикальне | Потрібен інший aspect-ratio |
| Instagram Reels | 9:16 вертикальне | Вже має min-height, але потребує покращення |
| TikTok | 9:16 вертикальне | Зараз показує тільки посилання |

---

### Рішення

---

### Файл 1: `src/lib/videoEmbed.ts`

#### 1.1 Додати поле `isVertical` до VideoEmbed

```tsx
export interface VideoEmbed {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'link';
  videoId?: string;
  embedUrl?: string;
  originalUrl: string;
  thumbnailUrl?: string;
  isVertical?: boolean;  // Додати для визначення орієнтації
}
```

#### 1.2 Визначати YouTube Shorts як вертикальне

```tsx
// YouTube Shorts regex
const YOUTUBE_SHORTS_REGEX = /youtube\.com\/shorts\/([^"&?\/\s]{11})/;

// В extractVideoEmbed:
// Перевіряємо YouTube Shorts окремо
const ytShortsMatch = url.match(YOUTUBE_SHORTS_REGEX);
if (ytShortsMatch && ytShortsMatch[1]) {
  return {
    platform: 'youtube',
    videoId: ytShortsMatch[1],
    embedUrl: `https://www.youtube.com/embed/${ytShortsMatch[1]}`,
    originalUrl: url,
    thumbnailUrl: `https://img.youtube.com/vi/${ytShortsMatch[1]}/maxresdefault.jpg`,
    isVertical: true  // Shorts завжди вертикальні
  };
}
```

#### 1.3 Визначати Facebook Reels як вертикальне

```tsx
// Оновити FACEBOOK_REGEX щоб розрізняти reels
const FACEBOOK_REEL_REGEX = /facebook\.com\/reel\/(\d+)/;

// В extractVideoEmbed:
const fbReelMatch = url.match(FACEBOOK_REEL_REGEX);
if (fbReelMatch && fbReelMatch[1]) {
  return {
    platform: 'facebook',
    videoId: fbReelMatch[1],
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
    originalUrl: url,
    isVertical: true  // Reels завжди вертикальні
  };
}
```

---

### Файл 2: `src/components/feed/VideoPreview.tsx`

#### 2.1 Використовувати адаптивний aspect-ratio залежно від орієнтації

```tsx
export function VideoPreview({ embed }: VideoPreviewProps) {
  // Визначаємо CSS клас для контейнера залежно від орієнтації
  const aspectClass = embed.isVertical 
    ? "aspect-[9/16] max-w-[320px] mx-auto"  // Вертикальне - 9:16, центроване
    : "aspect-video";  // Горизонтальне - 16:9, на всю ширину

  if (embed.platform === 'youtube') {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted">
        <div className={aspectClass}>
          <iframe
            src={embed.embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="YouTube відео"
          />
        </div>
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            {embed.isVertical ? 'YOUTUBE SHORTS' : 'YOUTUBE.COM'}
          </span>
        </div>
      </div>
    );
  }
  
  if (embed.platform === 'facebook') {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted">
        <div className={aspectClass}>
          <iframe
            src={embed.embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            title="Facebook відео"
          />
        </div>
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            {embed.isVertical ? 'FACEBOOK REELS' : 'FACEBOOK.COM'}
          </span>
        </div>
      </div>
    );
  }
  
  // ... решта платформ
}
```

---

### Візуальна схема результату

```text
ГОРИЗОНТАЛЬНЕ ВІДЕО (16:9):
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │                     [YouTube/Facebook Player]                           │ │
│ │                         aspect-video (16:9)                             │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ YOUTUBE.COM                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

ВЕРТИКАЛЬНЕ ВІДЕО (9:16 - Shorts/Reels):
┌─────────────────────────────────────────────────────────────────────────────┐
│              ┌───────────────────────────────┐                              │
│              │                               │                              │
│              │                               │                              │
│              │   [YouTube/Facebook Player]   │                              │
│              │       aspect-[9/16]           │                              │
│              │       max-w-[320px]           │                              │
│              │       mx-auto (центровано)    │                              │
│              │                               │                              │
│              │                               │                              │
│              └───────────────────────────────┘                              │
│              YOUTUBE SHORTS / FACEBOOK REELS                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/lib/videoEmbed.ts` | Додати `isVertical` поле, визначати YouTube Shorts та Facebook Reels |
| `src/components/feed/VideoPreview.tsx` | Використовувати `aspect-[9/16]` для вертикальних відео |

---

### Покращення для Instagram та TikTok

#### Instagram Reels
```tsx
if (embed.platform === 'instagram') {
  // Instagram Reels/Posts - завжди вертикальні, використовуємо фіксовану висоту
  return (
    <div className="rounded-lg overflow-hidden border max-w-[320px] mx-auto">
      <iframe
        src={embed.embedUrl}
        className="w-full aspect-[9/16]"
        frameBorder="0"
        scrolling="no"
        title="Instagram пост"
      />
    </div>
  );
}
```

#### TikTok (опціонально - додати iframe embed)
TikTok підтримує oEmbed API, можна отримати embed iframe:
```tsx
if (embed.platform === 'tiktok') {
  return (
    <div className="rounded-lg overflow-hidden border max-w-[320px] mx-auto">
      <blockquote 
        className="tiktok-embed" 
        cite={embed.originalUrl}
        data-video-id={embed.videoId}
      >
        <section>
          <a href={embed.originalUrl} target="_blank" rel="noopener noreferrer">
            Переглянути на TikTok
          </a>
        </section>
      </blockquote>
    </div>
  );
}
```

---

### Очікуваний результат

1. **YouTube Shorts** - показуються у вертикальному форматі 9:16, центровані
2. **Facebook Reels** - показуються у вертикальному форматі 9:16, без обрізання
3. **Звичайні YouTube/Facebook відео** - залишаються 16:9
4. **Instagram** - покращене відображення вертикальних постів/рилсів
5. **Мітки** - "YOUTUBE SHORTS" та "FACEBOOK REELS" для вертикальних відео

