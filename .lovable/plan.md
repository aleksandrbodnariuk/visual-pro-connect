

## План виправлення: Sticky Sidebar прокручується разом зі сторінкою

---

### Виявлена проблема

На скріншотах видно, що sidebar прокручується разом зі стіною новин замість того, щоб "прилипати" до верхньої або нижньої межі viewport. Проблема у **критичній помилці архітектури** поточної реалізації хука `useBidirectionalSticky`.

---

### Аналіз причин

**Проблема 1: Контейнер sidebar не має висоти**

У `Sidebar.tsx` контейнер має лише `className="relative"`:

```tsx
<div ref={containerRef} className="relative">
  <aside ref={sidebarRef} style={sidebarStyle}>
```

Але для роботи `sticky` елемента, його **батьківський контейнер повинен бути вищим** за сам sticky елемент. Зараз контейнер обгортає sidebar 1:1, тому sidebar не має "простору для прокрутки".

**Проблема 2: Grid cell не розтягується на всю висоту main**

У `Index.tsx`:
```tsx
<div className="hidden md:block md:col-span-4 lg:col-span-3">
  <Sidebar />
</div>
```

Grid cell з sidebar має висоту рівну висоті sidebar (auto), а не висоту основного контенту (main). CSS Grid за замовчуванням використовує `align-items: stretch`, але це працює тільки якщо контент в іншому grid cell вищий.

**Проблема 3: Логіка margin не працює коректно**

Хук розраховує `marginTop`/`marginBottom` при зміні напрямку скролу, але:
- Розрахунок `distanceFromContainerTop` дає неправильні значення коли контейнер має ту ж висоту що й sidebar
- `maxWalkDistance = containerHeight - sidebarHeight` = 0, коли вони однакові

---

### Правильне рішення

Для коректної роботи bidirectional sticky потрібно забезпечити, щоб **контейнер sidebar мав висоту main колонки**.

---

### Зміни у файлах

#### Файл 1: `src/pages/Index.tsx`

Додати `h-full` до обгортки sidebar, щоб вона розтягувалась на всю висоту grid row:

```tsx
{/* Sidebar - додаємо min-h-full щоб контейнер мав висоту main */}
<div className="hidden md:block md:col-span-4 lg:col-span-3 min-h-full">
  <Sidebar />
</div>
```

**Також** потрібно забезпечити що Grid використовує `items-stretch` (за замовчуванням) або явно додати `items-start` до grid контейнера.

---

#### Файл 2: `src/components/layout/Sidebar.tsx`

Контейнер повинен мати `h-full` щоб розтягнутися на всю висоту батьківського елемента:

```tsx
return (
  <div 
    ref={containerRef}
    className="relative h-full"  // Додати h-full
  >
    <aside 
      ref={sidebarRef}
      style={sidebarStyle}
      className={cn(
        "rounded-lg border bg-card scrollbar-hide",
        className
      )}
    >
```

---

#### Файл 3: `src/pages/Profile.tsx`

Аналогічно оновити grid cell для sidebar:

```tsx
<div className="hidden md:block md:col-span-4 lg:col-span-3 min-h-full">
  <Sidebar />
</div>
```

---

#### Файл 4: `src/hooks/useBidirectionalSticky.ts`

Додати захист від випадку коли контейнер і sidebar мають однакову висоту:

```tsx
// На початку handleScroll, після перевірки refs
const containerHeight = container.offsetHeight;
const sidebarHeight = sidebar.offsetHeight;

// Якщо контейнер такий самий як sidebar - sticky не потрібен
if (containerHeight <= sidebarHeight + 10) {
  setState({
    isSticky: true,
    stickyDirection: 'top',
    marginTop: 0,
    marginBottom: 0,
  });
  return;
}
```

---

### Візуальна схема правильної структури

```text
ЗАРАЗ (неправильно):
┌─────────────────────────────────────────────────┐
│ Grid Container                                   │
├────────────────┬────────────────────────────────┤
│ Sidebar Column │ Main Column                     │
│ ┌────────────┐ │ ┌────────────────────────────┐  │
│ │ Container  │ │ │                            │  │
│ │ (h=auto)   │ │ │                            │  │
│ │ ┌────────┐ │ │ │                            │  │
│ │ │Sidebar │ │ │ │     Стрічка новин          │  │
│ │ │sticky  │ │ │ │     Post 1                 │  │
│ │ └────────┘ │ │ │     Post 2                 │  │
│ └────────────┘ │ │     Post 3                 │  │
│                │ │     Post 4                 │  │
│ ↑ Пустий       │ │     Post 5                 │  │
│   простір      │ └────────────────────────────┘  │
└────────────────┴────────────────────────────────┘

Container висота = Sidebar висота → НЕ МАЄ простору для sticky!
```

```text
ПІСЛЯ ВИПРАВЛЕННЯ (правильно):
┌─────────────────────────────────────────────────┐
│ Grid Container                                   │
├────────────────┬────────────────────────────────┤
│ Sidebar Column │ Main Column                     │
│ ┌────────────┐ │ ┌────────────────────────────┐  │
│ │ Container  │ │ │                            │  │
│ │ (h=100%)   │ │ │                            │  │
│ │ ┌────────┐ │ │ │                            │  │
│ │ │Sidebar │ │ │ │     Стрічка новин          │  │
│ │ │sticky  │ │ │ │     Post 1                 │  │
│ │ └────────┘ │ │ │     Post 2                 │  │
│ │            │ │ │     Post 3                 │  │
│ │ Вільний    │ │ │     Post 4                 │  │
│ │ простір    │ │ │     Post 5                 │  │
│ │ для sticky │ │ │     Post 6                 │  │
│ └────────────┘ │ └────────────────────────────┘  │
└────────────────┴────────────────────────────────┘

Container висота = Main висота → sidebar має простір для "ходьби"!
```

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/pages/Index.tsx` | Додати `min-h-full` до grid cell sidebar |
| `src/components/layout/Sidebar.tsx` | Додати `h-full` до контейнера |
| `src/pages/Profile.tsx` | Додати `min-h-full` до grid cell sidebar |
| `src/hooks/useBidirectionalSticky.ts` | Додати захист від однакової висоти контейнера і sidebar |

---

### Очікуваний результат

1. Sidebar **прилипає до верху** при прокрутці вгору (sticky top: 80px)
2. Sidebar **прилипає до низу** при прокрутці вниз (sticky bottom: 20px)
3. Sidebar **не зникає** за межі екрану
4. Плавні переходи без "стрибків"
5. Працює на Index, Profile та інших сторінках

