

## План: Виправлення двонаправленого sticky sidebar (правильна імплементація)

---

### Виявлена проблема

Поточна імплементація в `useBidirectionalSticky.ts` має критичну помилку:

```text
ПОТОЧНИЙ ПІДХІД (НЕ ПРАЦЮЄ):
- Намагається динамічно змінювати властивість "top" у sticky
- Це не спрацьовує тому що sticky завжди "прилипає" до top, незалежно від значення

ПРАВИЛЬНИЙ ПІДХІД (як у Facebook):
- Використовувати margin-top/margin-bottom для "заморожування" позиції
- Змінювати напрямок sticky (top-0 або bottom-0) залежно від scroll direction
- Контейнер sidebar повинен бути flex з justify-end при sticky bottom
```

---

### Як працює правильне рішення

```text
КРОК 1: Користувач прокручує ВНИЗ
┌─────────────────────────────────────────────────┐
│ NAVBAR                                          │
├────────────────┬────────────────────────────────┤
│                │                                │
│  margin-top:   │   Feed                         │
│  100px         │   Post 4                       │
│  ┌──────────┐  │   Post 5                       │
│  │ Sidebar  │  │   Post 6                       │
│  │ bottom-0 │←─┤   [STICKY BOTTOM]              │
│  └──────────┘  │                                │
└────────────────┴────────────────────────────────┘
   ↑ margin-top "заморожує" пройдену відстань

КРОК 2: Користувач ЗМІНЮЄ напрямок - прокручує ВГОРУ
┌─────────────────────────────────────────────────┐
│ NAVBAR                                          │
├────────────────┬────────────────────────────────┤
│  ┌──────────┐  │                                │
│  │ Sidebar  │←─┤   Post 3  [STICKY TOP]         │
│  │ top-0    │  │   Post 4                       │
│  └──────────┘  │   Post 5                       │
│                │                                │
│  margin-bottom:│                                │
│  200px         │                                │
└────────────────┴────────────────────────────────┘
   ↑ margin-bottom "заморожує" залишкову відстань
```

**Ключова ідея**: Браузер сам керує sticky позиціонуванням, а ми тільки:
1. Відстежуємо напрямок прокрутки
2. Зберігаємо "пройдену відстань" через margin
3. Перемикаємо sticky напрямок (top або bottom)

---

### Зміни у файлах

---

### Файл 1: `src/hooks/useBidirectionalSticky.ts` - Повне переписування

Новий хук з правильною логікою:

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBidirectionalStickyOptions {
  topOffset?: number;
  bottomOffset?: number;
}

interface StickyState {
  stickyDirection: 'top' | 'bottom';
  offsetMargin: number;
}

/**
 * Hook для двонаправленого sticky як у Facebook.
 * Використовує margin-top/margin-bottom для "заморожування" позиції sidebar.
 */
export function useBidirectionalSticky(options: UseBidirectionalStickyOptions = {}) {
  const { topOffset = 80, bottomOffset = 20 } = options;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<StickyState>({
    stickyDirection: 'top',
    offsetMargin: 0,
  });
  
  // Відстежуємо попередню позицію прокрутки
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    const sidebar = sidebarRef.current;
    const container = containerRef.current;
    
    if (!sidebar || !container) return;
    
    const currentScrollY = window.scrollY;
    const isScrollingDown = currentScrollY > lastScrollY.current;
    const newDirection = isScrollingDown ? 'bottom' : 'top';
    
    // Оновлюємо стан тільки при зміні напрямку
    setState(prevState => {
      if (prevState.stickyDirection === newDirection) {
        return prevState;
      }
      
      // Розраховуємо пройдену відстань
      const distanceWalked = sidebar.offsetTop;
      const sidebarHeight = sidebar.clientHeight;
      const containerHeight = container.clientHeight;
      
      let newOffset = 0;
      
      if (newDirection === 'bottom') {
        // Перед sticky bottom - зберігаємо відстань від верху
        newOffset = distanceWalked;
      } else {
        // Перед sticky top - зберігаємо відстань від низу
        const totalWalkingSpace = containerHeight - sidebarHeight;
        const spaceLeftToWalk = totalWalkingSpace - distanceWalked;
        newOffset = Math.max(0, spaceLeftToWalk);
      }
      
      return {
        stickyDirection: newDirection,
        offsetMargin: newOffset,
      };
    });
    
    lastScrollY.current = currentScrollY;
  }, []);

  const onScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        handleScroll();
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [handleScroll]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onScroll]);

  // Генеруємо стилі для sidebar
  const sidebarStyle: React.CSSProperties = {
    position: 'sticky',
    top: state.stickyDirection === 'top' ? `${topOffset}px` : 'auto',
    bottom: state.stickyDirection === 'bottom' ? `${bottomOffset}px` : 'auto',
    marginTop: state.stickyDirection === 'bottom' ? `${state.offsetMargin}px` : 0,
    marginBottom: state.stickyDirection === 'top' ? `${state.offsetMargin}px` : 0,
  };

  // Генеруємо стилі для контейнера
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: state.stickyDirection === 'bottom' ? 'flex-end' : 'flex-start',
    minHeight: '100%',
  };

  return { 
    sidebarRef, 
    containerRef,
    sidebarStyle, 
    containerStyle,
    stickyDirection: state.stickyDirection,
  };
}
```

---

### Файл 2: `src/components/layout/Sidebar.tsx` - Оновлення структури

Sidebar тепер повинен мати обгортку-контейнер:

```tsx
export function Sidebar({ className }: SidebarProps) {
  // ... інші хуки
  
  const { sidebarRef, containerRef, sidebarStyle, containerStyle } = useBidirectionalSticky({
    topOffset: 80,
    bottomOffset: 20
  });
  
  return (
    <div 
      ref={containerRef}
      style={containerStyle}
      className="h-full"
    >
      <aside 
        ref={sidebarRef}
        style={sidebarStyle}
        className={cn(
          "rounded-lg border bg-card scrollbar-hide",
          className
        )}
      >
        {/* ... весь контент sidebar */}
      </aside>
    </div>
  );
}
```

---

### Файл 3: `src/pages/Index.tsx` - Забезпечити висоту контейнера

Grid елемент з sidebar повинен мати повну висоту:

```tsx
<div className="container grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 3xl:gap-8 px-3 sm:px-4 md:px-6 py-4 md:py-6">
  {/* Sidebar контейнер - потрібна висота для роботи sticky */}
  <div className="hidden md:block md:col-span-4 lg:col-span-3">
    <Sidebar />
  </div>
  
  {/* Основний контент */}
  <main className="col-span-1 md:col-span-8 lg:col-span-9">
    {/* ... */}
  </main>
</div>
```

Важливо: прибрати `self-start` щоб контейнер sidebar мав повну висоту grid row.

---

### Файл 4: `src/pages/Profile.tsx` - Аналогічні зміни

Прибрати `self-start` з sidebar контейнера на сторінці профілю.

---

### Візуальна діаграма рішення

```text
СТРУКТУРА DOM:

<div className="grid">                         ← Grid контейнер
  │
  ├── <div ref={containerRef}                  ← Контейнер sidebar (flex, повна висота)
  │       style={{ 
  │         display: flex,
  │         flexDirection: column,
  │         justifyContent: stickyDirection === 'bottom' ? 'flex-end' : 'flex-start'
  │       }}>
  │     │
  │     └── <aside ref={sidebarRef}            ← Сам sidebar (sticky)
  │             style={{
  │               position: sticky,
  │               top/bottom: залежить від напрямку,
  │               marginTop/Bottom: "заморожує" позицію
  │             }}>
  │           ... контент ...
  │         </aside>
  │   </div>
  │
  └── <main>                                   ← Основний контент (довший)
        Post 1, Post 2, Post 3...
      </main>
</div>
```

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/hooks/useBidirectionalSticky.ts` | Повне переписування з правильною логікою margin |
| `src/components/layout/Sidebar.tsx` | Додати контейнер-обгортку з ref та стилями |
| `src/pages/Index.tsx` | Прибрати `self-start`, дозволити повну висоту |
| `src/pages/Profile.tsx` | Прибрати `self-start`, дозволити повну висоту |

---

### Очікуваний результат

1. **Sidebar прилипає до низу** при прокрутці вниз (як у Facebook)
2. **Sidebar прилипає до верху** при прокрутці вгору
3. **Плавні переходи** без "стрибків" - браузер керує sticky
4. **Sidebar ніколи не зникає** повністю за межі екрану

