

## План: Двонаправлена "липка" бокова панель як у Facebook

---

### Аналіз проблеми

На скріншотах видно:

**У вас зараз:**
- Sidebar прокручується повністю разом зі сторінкою
- Коли прокручуємо вниз - sidebar зникає за верхню межу
- Коли прокручуємо вгору - sidebar зникає за нижню межу

**У Facebook:**
- Sidebar прокручується тільки до своїх меж
- При прокрутці вниз - sidebar "прилипає" до нижньої межі viewport
- При прокрутці вгору - sidebar "прилипає" до верхньої межі viewport
- Sidebar ніколи повністю не зникає з екрану

---

### Як працює Facebook Bidirectional Sticky

```text
КРОК 1: Початок - sidebar вгорі
┌────────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                              │
├──────────────────┬─────────────────────────────────────────────────┤
│ [Sidebar TOP]    │  Feed                                            │
│   Меню           │   Post 1                                         │
│   Категорії      │   Post 2                                         │
│ [Sidebar BOTTOM] │   Post 3                                         │
│                  │                                                  │
└──────────────────┴─────────────────────────────────────────────────┘

КРОК 2: Прокрутка ВНИЗ - sidebar прилипає ЗНИЗУ
┌────────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                              │
├──────────────────┬─────────────────────────────────────────────────┤
│                  │   Post 4                                         │
│   Меню           │   Post 5                                         │
│   Категорії      │   Post 6                                         │
│ [Sidebar BOTTOM] │   Post 7    ← Sidebar "прилип" знизу             │
│ ─────────────────│──────────────────────────────────────────────── │
└──────────────────┴─────────────────────────────────────────────────┘

КРОК 3: Прокрутка ВГОРУ - sidebar прилипає ЗВЕРХУ
┌────────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                              │
├──────────────────┬─────────────────────────────────────────────────┤
│ [Sidebar TOP] ←──│   Post 3     ← Sidebar "прилип" зверху           │
│   Меню           │   Post 4                                         │
│   Категорії      │   Post 5                                         │
│ [Sidebar BOTTOM] │   Post 6                                         │
│                  │                                                  │
└──────────────────┴─────────────────────────────────────────────────┘
```

---

### Технічне рішення

Facebook використовує JavaScript для відстеження напрямку прокрутки та динамічної зміни CSS властивостей `top` та `bottom`.

---

### Файл 1: Створити хук `src/hooks/useBidirectionalSticky.ts`

Цей хук буде відстежувати напрямок прокрутки та розраховувати позицію sidebar:

```tsx
import { useEffect, useRef, useState } from 'react';

interface UseBidirectionalStickyOptions {
  topOffset?: number;  // Відступ від верху (висота navbar)
  bottomOffset?: number;  // Відступ від низу
}

interface StickyState {
  position: 'relative' | 'fixed' | 'absolute';
  top?: string;
  bottom?: string;
  translateY?: string;
}

export function useBidirectionalSticky(options: UseBidirectionalStickyOptions = {}) {
  const { topOffset = 80, bottomOffset = 20 } = options;
  const sidebarRef = useRef<HTMLElement>(null);
  const [stickyStyle, setStickyStyle] = useState<React.CSSProperties>({});
  
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollDirection: 'up' | 'down' = 'down';
    let sidebarTop = 0;
    
    const handleScroll = () => {
      if (!sidebarRef.current) return;
      
      const sidebar = sidebarRef.current;
      const sidebarRect = sidebar.getBoundingClientRect();
      const sidebarHeight = sidebarRect.height;
      const viewportHeight = window.innerHeight;
      const currentScrollY = window.scrollY;
      
      // Визначаємо напрямок прокрутки
      const newDirection = currentScrollY > lastScrollY ? 'down' : 'up';
      const directionChanged = scrollDirection !== newDirection;
      scrollDirection = newDirection;
      
      // Якщо sidebar менший за viewport - просто sticky top
      if (sidebarHeight <= viewportHeight - topOffset) {
        setStickyStyle({
          position: 'sticky',
          top: `${topOffset}px`,
        });
        lastScrollY = currentScrollY;
        return;
      }
      
      // Логіка для sidebar більшого за viewport
      if (scrollDirection === 'down') {
        // Прокрутка вниз - фіксуємо sidebar знизу
        if (sidebarRect.bottom <= viewportHeight - bottomOffset) {
          setStickyStyle({
            position: 'sticky',
            bottom: `${bottomOffset}px`,
            top: 'auto',
          });
        }
      } else {
        // Прокрутка вгору - фіксуємо sidebar зверху
        if (sidebarRect.top >= topOffset) {
          setStickyStyle({
            position: 'sticky',
            top: `${topOffset}px`,
            bottom: 'auto',
          });
        }
      }
      
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Початкова ініціалізація
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [topOffset, bottomOffset]);
  
  return { sidebarRef, stickyStyle };
}
```

---

### Файл 2: Оновити `src/components/layout/Sidebar.tsx`

Інтегрувати хук у компонент:

```tsx
import { useBidirectionalSticky } from '@/hooks/useBidirectionalSticky';

export function Sidebar({ className }: SidebarProps) {
  const { sidebarRef, stickyStyle } = useBidirectionalSticky({
    topOffset: 80,  // Висота navbar
    bottomOffset: 20
  });
  
  // ... решта коду
  
  return (
    <aside 
      ref={sidebarRef as React.RefObject<HTMLElement>}
      style={stickyStyle}
      className={cn(
        "rounded-lg border bg-card scrollbar-hide",
        className
      )}
    >
      {/* ... */}
    </aside>
  );
}
```

---

### Файл 3: Оновити `src/index.css`

Спростити `.sticky-sidebar` оскільки логіка тепер в JavaScript:

```css
/* Оновлена утиліта - тільки базові стилі */
.sticky-sidebar {
  max-height: none; /* Прибираємо обмеження - контролюється JS */
  overflow-y: visible; /* Прибираємо внутрішній скрол */
}
```

---

### Файл 4: Оновити `src/pages/Index.tsx`

Переконатися що sidebar обгорнутий у правильний контейнер:

```tsx
<div className="container grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 3xl:gap-8 px-3 sm:px-4 md:px-6 py-4 md:py-6">
  {/* Sidebar обгортка з self-start для правильного позиціонування */}
  <div className="hidden md:block md:col-span-4 lg:col-span-3 self-start">
    <Sidebar />
  </div>
  
  {/* Основний контент */}
  <main className="col-span-1 md:col-span-8 lg:col-span-9">
    {/* ... */}
  </main>
</div>
```

---

### Файл 5: Оновити `src/pages/Profile.tsx`

Аналогічно оновити sidebar обгортку:

```tsx
<div className="hidden md:block md:col-span-4 lg:col-span-3 self-start">
  <Sidebar />
</div>
```

---

### Альтернативний підхід (чистий CSS з CSS custom properties)

Якщо хочемо уникнути складного JavaScript, можна використати простіший підхід який працює для більшості випадків:

```css
.sticky-sidebar {
  position: sticky;
  /* Фіксований top для простого sticky */
  top: 5rem;
  /* Обмежуємо висоту щоб sidebar не виходив за viewport */
  max-height: calc(100vh - 6rem);
  /* Внутрішній скрол тільки для sidebar */
  overflow-y: auto;
  /* Приховуємо скролбар */
  scrollbar-width: none;
}

.sticky-sidebar::-webkit-scrollbar {
  display: none;
}
```

Цей підхід простіший, але sidebar буде мати власний внутрішній скрол замість двонаправленого sticky.

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/hooks/useBidirectionalSticky.ts` | **Новий файл** - хук для відстеження прокрутки та розрахунку позиції |
| `src/components/layout/Sidebar.tsx` | Інтегрувати хук, прибрати клас `sticky-sidebar` |
| `src/index.css` | Спростити/видалити `.sticky-sidebar` |
| `src/pages/Index.tsx` | Додати `self-start` до обгортки sidebar |
| `src/pages/Profile.tsx` | Додати `self-start` до обгортки sidebar |

---

### Очікуваний результат

1. **Sidebar завжди видимий** - не зникає повністю за межі екрану
2. **Двонаправлена прокрутка** - при прокрутці вниз sidebar "прилипає" знизу, при прокрутці вгору - зверху
3. **Як у Facebook** - поведінка ідентична до бокової панелі Facebook
4. **Адаптивність** - працює на всіх розмірах екранів
5. **Плавна анімація** - без "стрибків" при зміні напрямку прокрутки

