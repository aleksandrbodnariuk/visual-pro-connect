

## План виправлення: Bidirectional Sticky Sidebar

### Виявлена проблема

На основі аналізу коду та порівняння з офіційною реалізацією (movingparts.dev), я виявив **критичні помилки** у поточній імплементації:

---

### Причини зникнення sidebar

**1. Неправильний `offsetParent`**

У хуку `useBidirectionalSticky` використовується:
```tsx
const distanceWalked = sidebar.offsetTop;
```

Але `offsetTop` вимірює відстань до `offsetParent`, який може бути **не контейнером sidebar**, а іншим елементом з `position: relative/absolute`. Це призводить до неправильних розрахунків margin.

**2. Контейнер не має правильної висоти**

У `Sidebar.tsx` контейнер має клас `h-full`:
```tsx
<div ref={containerRef} style={containerStyle} className="h-full">
```

Але `h-full` (100% висоти) не працює, якщо батьківський елемент не має явної висоти. Grid cell не гарантує висоту.

**3. Стилі `containerStyle` конфліктують**

```tsx
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: state.stickyDirection === 'bottom' ? 'flex-end' : 'flex-start',
  minHeight: '100%',
};
```

`justify-content: flex-end` + `minHeight: 100%` без реальної висоти контейнера = sidebar "падає" за межі viewport.

**4. Margin розрахунки некоректні**

При зміні напрямку, `offsetMargin` може стати надто великим, що "виштовхує" sidebar за межі видимості.

---

### Правильне рішення (за зразком movingparts.dev)

Ключові принципи з офіційної імплементації:

```text
1. Контейнер sidebar = RELATIVE з повною висотою контенту
2. Sidebar = STICKY з динамічним top/bottom
3. Margin = "заморожує" позицію при зміні напрямку
4. offsetTop повинен бути відносно КОНТЕЙНЕРА, а не document
```

---

### Зміни у файлах

#### Файл 1: `src/hooks/useBidirectionalSticky.ts`

Повністю переписати з правильною логікою:

1. **Видалити `containerStyle`** - він не потрібен, тільки заважає
2. **Правильно розраховувати `distanceWalked`** відносно контейнера
3. **Додати перевірку** чи sidebar вище за viewport (якщо ні - просто sticky top)
4. **Використовувати `getBoundingClientRect()`** замість `offsetTop` для точніших розрахунків

```tsx
// Ключові зміни:

// 1. Перевірка чи потрібен bidirectional sticky
const sidebarHeight = sidebar.clientHeight;
const viewportHeight = window.innerHeight;
const availableHeight = viewportHeight - topOffset - bottomOffset;

// Якщо sidebar менший за viewport - просто sticky top
if (sidebarHeight <= availableHeight) {
  return { position: 'sticky', top: `${topOffset}px` };
}

// 2. Розрахунок відносно контейнера
const containerRect = container.getBoundingClientRect();
const sidebarRect = sidebar.getBoundingClientRect();
const distanceFromContainerTop = sidebarRect.top - containerRect.top;

// 3. Правильні margin при зміні напрямку
if (newDirection === 'bottom') {
  newOffset = Math.max(0, distanceFromContainerTop);
} else {
  const containerHeight = container.clientHeight;
  const totalWalkingSpace = containerHeight - sidebarHeight;
  newOffset = Math.max(0, totalWalkingSpace - distanceFromContainerTop);
}
```

---

#### Файл 2: `src/components/layout/Sidebar.tsx`

1. **Прибрати зайву обгортку** з `containerStyle`
2. **Контейнер має бути простим div** з `position: relative`
3. **Aside отримує тільки `sidebarStyle`**

```tsx
return (
  <div 
    ref={containerRef}
    className="relative"  // Тільки relative, без h-full
  >
    <aside 
      ref={sidebarRef}
      style={sidebarStyle}
      className={cn(
        "rounded-lg border bg-card scrollbar-hide",
        className
      )}
    >
      {/* ... контент ... */}
    </aside>
  </div>
);
```

---

#### Файл 3: `src/pages/Index.tsx`

Grid cell для sidebar повинен **не обмежувати висоту**:

```tsx
{/* Sidebar колонка без self-start, щоб вона розтягувалася на всю висоту main */}
<div className="hidden md:block md:col-span-4 lg:col-span-3">
  <Sidebar />
</div>
```

Це вже правильно, але потрібно переконатися що основний контейнер grid має `align-items: stretch` (за замовчуванням).

---

### Візуальна схема правильної роботи

```text
Grid контейнер
├─ Sidebar Column (col-span-3)
│   └─ <div relative>           ← containerRef (висота = висота main)
│       └─ <aside sticky>       ← sidebarRef 
│           ├─ top: 80px        (при прокрутці вгору)
│           ├─ margin-bottom: X
│           └─ ИЛИ
│           ├─ bottom: 20px     (при прокрутці вниз)
│           └─ margin-top: Y
│
└─ Main Column (col-span-9)
    └─ Стрічка новин (дуже довга)
```

---

### Альтернативний простий підхід

Якщо складна логіка не працює, є простіший варіант - **внутрішній скрол sidebar**:

```tsx
<aside className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
```

Цей підхід:
- Sidebar прилипає до верху
- Має обмежену висоту (viewport мінус navbar)
- Власний внутрішній скрол для довгого контенту
- Простий, надійний, працює завжди

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/hooks/useBidirectionalSticky.ts` | Переписати з правильною логікою розрахунку позиції |
| `src/components/layout/Sidebar.tsx` | Спростити структуру контейнера |
| `src/pages/Index.tsx` | Без змін (вже коректно) |

---

### Очікуваний результат

1. Sidebar **не зникає** при прокрутці
2. При прокрутці вниз - sidebar прилипає до нижньої межі viewport
3. При прокрутці вгору - sidebar прилипає до верхньої межі viewport
4. Плавні переходи без "стрибків"
5. Працює на всіх розмірах екранів

