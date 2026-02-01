

## План: Виправлення фільтрів категорій та підтримка Facebook відео

---

### Проблема 1: Фільтри категорій не працюють

**Причина:** Пости не мають автоматично присвоєної категорії. При створенні поста категорія залишається `null`, тому фільтри "Фото", "Відео" показують "Немає публікацій".

**Поточна логіка фільтрації (рядок 192-195):**
```tsx
const filteredPosts = posts.filter(post => {
  if (activeCategory === "all") return true;
  return post.category === activeCategory;  // ← Перевіряє тільки збережену категорію
});
```

**Рішення:** Фільтрувати пости на основі їх контенту:
- **Фото** - пости з зображеннями (`media_url` містить розширення зображення)
- **Відео** - пости з відео файлами АБО посиланнями на YouTube/Facebook/TikTok
- **Музика**, **Події** - за збереженою категорією

---

### Проблема 2: Facebook посилання не мають превʼю

**Причина:** У `videoEmbed.ts` немає регулярного виразу для Facebook Reels та відео.

**Рішення:** Додати підтримку Facebook:
- Facebook Reels: `facebook.com/reel/ID`
- Facebook Watch: `facebook.com/watch/?v=ID`

---

### Файли для редагування

#### 1. `src/lib/videoEmbed.ts` - Додати підтримку Facebook

```tsx
// Додати регулярний вираз для Facebook
const FACEBOOK_REGEX = /facebook\.com\/(?:reel|watch\/?\?v=)\/(\d+)/;

// Додати платформу 'facebook' до типу VideoEmbed
export interface VideoEmbed {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'link';
  // ...
}

// Додати обробку Facebook у функції extractVideoEmbed
const fbMatch = url.match(FACEBOOK_REGEX);
if (fbMatch && fbMatch[1]) {
  return {
    platform: 'facebook',
    videoId: fbMatch[1],
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`,
    originalUrl: url
  };
}
```

#### 2. `src/components/feed/VideoPreview.tsx` - Додати рендеринг Facebook

```tsx
if (embed.platform === 'facebook') {
  return (
    <div className="rounded-lg overflow-hidden border bg-muted">
      <div className="aspect-video">
        <iframe
          src={embed.embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          title="Facebook відео"
        />
      </div>
      <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">FACEBOOK.COM</span>
      </div>
    </div>
  );
}
```

#### 3. `src/components/feed/NewsFeed.tsx` - Виправити логіку фільтрації

```tsx
import { extractVideoEmbed } from "@/lib/videoEmbed";

const filteredPosts = posts.filter(post => {
  if (activeCategory === "all") return true;
  
  // Фільтр "Фото" - пости із зображеннями
  if (activeCategory === "photo") {
    if (!post.media_url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => post.media_url?.toLowerCase().endsWith(ext));
  }
  
  // Фільтр "Відео" - пости з відео файлами або посиланнями на відео платформи
  if (activeCategory === "video") {
    // Перевіряємо media_url на відео файл
    if (post.media_url) {
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
      if (videoExtensions.some(ext => post.media_url?.toLowerCase().endsWith(ext))) {
        return true;
      }
    }
    // Перевіряємо контент на посилання YouTube/Facebook/TikTok
    const videoEmbed = extractVideoEmbed(post.content);
    if (videoEmbed && ['youtube', 'facebook', 'tiktok', 'instagram'].includes(videoEmbed.platform)) {
      return true;
    }
    return false;
  }
  
  // Інші категорії (музика, події) - за збереженою категорією
  return post.category === activeCategory;
});
```

---

### Візуальна схема змін

```text
БУЛО:
┌─────────────────────────────────────────────────────────────────┐
│ Фільтр "Відео" → Шукає post.category === "video" → Немає постів │
│                                                                 │
│ Facebook посилання → platform: 'link' → Тільки текст посилання  │
└─────────────────────────────────────────────────────────────────┘

СТАНЕ:
┌─────────────────────────────────────────────────────────────────┐
│ Фільтр "Відео" → Аналізує media_url та content → Знаходить пости│
│                  з відео файлами та посиланнями YouTube/Facebook│
│                                                                 │
│ Facebook посилання → platform: 'facebook' → Вбудований плеєр    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/lib/videoEmbed.ts` | Додати FACEBOOK_REGEX та обробку Facebook платформи |
| `src/components/feed/VideoPreview.tsx` | Додати рендеринг Facebook відео через iframe |
| `src/components/feed/NewsFeed.tsx` | Виправити логіку фільтрації на основі контенту |

---

### Очікуваний результат

1. **Фільтр "Фото"** - показує всі пости з зображеннями
2. **Фільтр "Відео"** - показує пости з відео файлами та посиланнями на YouTube, Facebook, TikTok, Instagram
3. **Facebook Reels** - відображаються як вбудований плеєр (як YouTube)
4. **Інші фільтри** - працюють за збереженою категорією поста

