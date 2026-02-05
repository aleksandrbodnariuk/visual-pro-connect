

## План: Фіксований Sidebar з власною прокруткою

---

### Проблема

Bidirectional sticky реалізація виявилася занадто складною і ненадійною. CSS `position: sticky` має багато обмежень і залежить від правильної структури DOM, висоти батьківських елементів тощо.

---

### Рішення: Фіксований Sidebar

Замість складної логіки - простий і надійний підхід:

```text
┌─────────────────────────────────────────────────────────────┐
│ Navbar (fixed, top: 0, height: ~64px)                       │
├─────────────────────┬───────────────────────────────────────┤
│                     │                                       │
│  Sidebar            │   Основний контент                    │
│  ┌───────────────┐  │   (прокручується разом зі сторінкою)  │
│  │ position:     │  │                                       │
│  │ fixed         │  │   Post 1                              │
│  │               │  │   Post 2                              │
│  │ top: 80px     │  │   Post 3                              │
│  │ max-height:   │  │   Post 4                              │
│  │ calc(100vh-   │  │   Post 5                              │
│  │ 100px)        │  │   Post 6                              │
│  │               │  │   ...                                 │
│  │ overflow-y:   │  │                                       │
│  │ auto          │  │                                       │
│  │ (власний      │  │                                       │
│  │  скрол)       │  │                                       │
│  └───────────────┘  │                                       │
│                     │                                       │
└─────────────────────┴───────────────────────────────────────┘
```

---

### Переваги цього підходу

1. **100% надійність** - `position: fixed` завжди працює
2. **Простота** - не потрібен складний хук
3. **Власна прокрутка** - sidebar може бути будь-якої довжини
4. **Незалежність** - sidebar не залежить від прокрутки основного контенту
5. **Продуктивність** - немає JavaScript обробників scroll

---

### Зміни у файлах

---

#### Файл 1: `src/components/layout/Sidebar.tsx`

Повністю прибрати хук `useBidirectionalSticky` і застосувати CSS-only рішення:

**Основні зміни:**

1. Видалити імпорт та використання `useBidirectionalSticky`
2. Прибрати контейнер-обгортку з ref
3. Застосувати fixed позиціонування до `<aside>`
4. Додати `max-height` та `overflow-y: auto` для внутрішньої прокрутки

```tsx
// БУЛО:
const { sidebarRef, containerRef, sidebarStyle } = useBidirectionalSticky({...});

return (
  <div ref={containerRef} className="relative h-full">
    <aside ref={sidebarRef} style={sidebarStyle} className={cn(...)}>
```

```tsx
// СТАНЕ:
return (
  <aside 
    className={cn(
      "fixed top-20 left-0 w-[calc(25%-1rem)] max-w-[280px]",
      "max-h-[calc(100vh-6rem)] overflow-y-auto",
      "rounded-lg border bg-card scrollbar-hide",
      "ml-4 md:ml-6 lg:ml-8",
      className
    )}
  >
```

---

#### Файл 2: `src/pages/Index.tsx`

Оновити grid layout - sidebar тепер fixed, тому потрібен "spacer" div:

```tsx
<div className="container grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 3xl:gap-8 px-3 sm:px-4 md:px-6 py-4 md:py-6">
  {/* Spacer для fixed sidebar */}
  <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
  
  {/* Sidebar - тепер fixed, рендериться окремо */}
  <Sidebar className="hidden md:block" />
  
  {/* Основний контент */}
  <main className="col-span-1 md:col-span-8 lg:col-span-9">
    ...
  </main>
</div>
```

**Альтернатива**: Sidebar розміщується поза grid, а в grid залишається тільки spacer.

---

#### Файл 3: `src/pages/Profile.tsx`

Аналогічні зміни до Index.tsx - spacer замість Sidebar у grid.

---

#### Файл 4: Видалити `src/hooks/useBidirectionalSticky.ts`

Хук більше не потрібен - можна видалити файл.

---

### Технічні деталі CSS

| Властивість | Значення | Пояснення |
|-------------|----------|-----------|
| `position` | `fixed` | Фіксована позиція відносно viewport |
| `top` | `80px` (5rem) | Відступ від navbar |
| `left` | `0` | Початок від лівого краю |
| `width` | `calc(25% - 1rem)` | Ширина як 3 колонки з 12 мінус gap |
| `max-w` | `280px` | Максимальна ширина на великих екранах |
| `max-height` | `calc(100vh - 6rem)` | Висота viewport мінус navbar і відступи |
| `overflow-y` | `auto` | Власна прокрутка при потребі |
| `margin-left` | `1rem-2rem` | Container padding |

---

### Розрахунок ширини

На десктопі sidebar займає 3 колонки з 12 у контейнері:
- Container max-width: ~1280px
- Sidebar колонка: 25% = ~320px
- З урахуванням gap: ~280-300px

Формула ширини для fixed елемента:
```css
width: calc((100vw - container-padding) * 0.25 - gap);
/* або простіше */
width: calc(25vw - 3rem);
max-width: 280px;
```

---

### Підсумок змін

| Файл | Дія |
|------|-----|
| `src/components/layout/Sidebar.tsx` | Переробити на fixed + overflow-y |
| `src/pages/Index.tsx` | Spacer div + Sidebar поза grid |
| `src/pages/Profile.tsx` | Spacer div + Sidebar поза grid |
| `src/hooks/useBidirectionalSticky.ts` | Видалити (не потрібен) |

---

### Очікуваний результат

1. Sidebar **завжди видимий** на екрані при прокрутці
2. Sidebar має **власну прокрутку** якщо контент не вміщується
3. Основна сторінка **прокручується незалежно**
4. **Простий і надійний** код без складної логіки
5. Працює на всіх сторінках однаково

