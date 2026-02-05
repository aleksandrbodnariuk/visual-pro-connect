

## План: Виправлення подвійної прокрутки - одна прокрутка як у Facebook

---

### Аналіз проблеми

На скріншотах чітко видно проблему:

**У вас зараз:**
- Два скролбари: один для всієї сторінки (праворуч), інший для бічної панелі (sidebar)
- Сторінка "стрибає" вгору при взаємодії

**У Facebook:**
- Один глобальний скролбар для всього контенту
- Sidebar та права панель "прилипають" до верху екрану (sticky)
- При прокрутці рухається тільки центральна стрічка новин

---

### Як це працює у Facebook

Facebook використовує техніку "Sticky Sidebars with Single Page Scroll":

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  NAVBAR (sticky top-0)                                                      │
├───────────────┬───────────────────────────────────┬─────────────────────────┤
│               │                                   │                         │
│  LEFT SIDEBAR │      MAIN FEED (scrollable)       │    RIGHT SIDEBAR        │
│  (sticky)     │                                   │    (sticky)             │
│  position:    │   ┌───────────────────────────┐   │    position:            │
│  sticky       │   │ Post 1                    │   │    sticky               │
│  top: 64px    │   └───────────────────────────┘   │    top: 64px            │
│  height:      │   ┌───────────────────────────┐   │    max-height:          │
│  fit-content  │   │ Post 2                    │   │    calc(100vh - 64px)   │
│               │   └───────────────────────────┘   │                         │
│               │   ┌───────────────────────────┐   │                         │
│               │   │ Post 3                    │   │                         │
│               │   └───────────────────────────┘   │                         │
│               │                ↓ (scroll)         │                         │
└───────────────┴───────────────────────────────────┴─────────────────────────┘
                           ↕ ОДИН СКРОЛБАР
```

**Ключові принципи:**
1. `html, body` - природна прокрутка документа (без overflow: hidden)
2. Sidebar - `position: sticky`, `top: navbar_height`, без власного скролу
3. Якщо sidebar занадто довгий - обмежити `max-height` та додати `overflow-y: auto` тільки для нього

---

### Виявлені проблеми в коді

#### 1. Конфлікт стилів `#root` в App.css

```css
/* App.css - залишок від Vite template */
#root {
  max-width: 1280px;  /* ПРОБЛЕМА: Обмежує ширину */
  margin: 0 auto;
  padding: 2rem;      /* ПРОБЛЕМА: Зайвий padding */
  text-align: center;
}
```

#### 2. Стилі в index.html

```html
<style>
  #root {
    height: 100%;           /* Може викликати проблеми */
    display: flex;
    flex-direction: column;
  }
</style>
```

#### 3. Sidebar має overflow при занадто великій висоті

Sidebar не обмежений по висоті, що створює другу прокрутку.

---

### Рішення

---

### Файл 1: `src/App.css` - Видалити конфліктні стилі

**Повністю переписати файл:**

```css
/* Видаляємо все старе - залишаємо тільки необхідне */
#root {
  /* Тепер контейнер займає 100% ширини */
  width: 100%;
  max-width: none;
  padding: 0;
  margin: 0;
  text-align: left;
}
```

---

### Файл 2: `index.html` - Виправити стилі для єдиної прокрутки

Змінити `<style>` блок:

```html
<style>
  html {
    /* Один скролбар для всього документа */
    overflow-y: scroll;
    overflow-x: hidden;
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  
  body {
    min-height: 100vh;
    overflow-x: hidden;
    /* НЕ встановлюємо overflow-y: hidden */
  }
  
  #root {
    min-height: 100vh;
  }
  
  /* ... інші стилі залишаються */
</style>
```

---

### Файл 3: `src/components/layout/Sidebar.tsx` - Sticky з обмеженою висотою

Sidebar повинен:
- Бути `sticky` з `top` рівним висоті navbar
- Мати `max-height` щоб не виходити за межі viewport
- Власний скрол тільки якщо контент перевищує viewport

**Обгортка для aside:**

```tsx
<aside className={cn(
  "rounded-lg border bg-card sticky top-16 md:top-20",
  "max-h-[calc(100vh-5rem)] overflow-y-auto",  // Власний скрол тільки при потребі
  "scrollbar-hide",  // Приховати скролбар для чистішого вигляду
  className
)}>
```

---

### Файл 4: `src/pages/Index.tsx` - Оптимізація layout

Переконатися що layout не створює зайвих прокруток:

```tsx
return (
  <div className="min-h-screen bg-background pb-20 md:pb-0">
    <Navbar />
    {/* Прибираємо будь-які overflow або height обмеження з container */}
    <div className="container grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 3xl:gap-8 px-3 sm:px-4 md:px-6 py-4 md:py-6">
      <Sidebar className="hidden md:block md:col-span-4 lg:col-span-3" />
      {/* Main content - природна висота */}
      <main className="col-span-1 md:col-span-8 lg:col-span-9">
        {/* ... */}
      </main>
    </div>
  </div>
);
```

---

### Файл 5: `src/index.css` - Глобальні стилі прокрутки

Додати стилі для плавної прокрутки та підтримки TV:

```css
@layer base {
  html {
    /* Єдина прокрутка для документа */
    scroll-behavior: smooth;
  }
  
  body {
    /* Дозволяємо природну прокрутку */
    overflow-x: hidden;
  }
}

@layer utilities {
  /* Утиліта для sticky sidebar */
  .sticky-sidebar {
    position: sticky;
    top: 5rem; /* Висота navbar */
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    scrollbar-width: thin;
  }
  
  /* Для TV - більші відступи */
  @media (min-width: 1920px) {
    .sticky-sidebar {
      top: 6rem;
      max-height: calc(100vh - 7rem);
    }
  }
}
```

---

### Візуальне порівняння

```text
ЗАРАЗ (дві прокрутки):
┌───────────────────────────────────────────────────────────────────────┐▲
│ Navbar                                                                │░
├─────────────────┬────────────────────────────────────┬────────────────┤░
│ ┌─────────────┐▲│                                    │                │░
│ │ Sidebar     │░│  Feed                              │                │░
│ │             │░│  ┌──────────────────────────────┐  │                │░
│ │ Menu        │░│  │ Post                         │  │                │░ ← ДВА СКРОЛА!
│ │ Categories  │░│  └──────────────────────────────┘  │                │░
│ └─────────────┘▼│                                    │                │░
└─────────────────┴────────────────────────────────────┴────────────────┘▼

ПІСЛЯ (як Facebook):
┌───────────────────────────────────────────────────────────────────────┐
│ Navbar (sticky top-0)                                                 │
├─────────────────┬────────────────────────────────────┬────────────────┤
│ Sidebar         │                                    │ Right Panel    │
│ (sticky)        │  Feed                              │ (sticky)       │
│                 │  ┌──────────────────────────────┐  │                │
│ Menu            │  │ Post 1                       │  │                │
│ Categories      │  └──────────────────────────────┘  │                │
│                 │  ┌──────────────────────────────┐  │                │
│                 │  │ Post 2                       │  │                │▲
│                 │  └──────────────────────────────┘  │                │░
│                 │                 ↓                  │                │░ ← ОДИН СКРОЛ
│                 │  ┌──────────────────────────────┐  │                │░
│                 │  │ Post 3                       │  │                │▼
└─────────────────┴────────────────────────────────────┴────────────────┘
```

---

### Адаптивність для різних пристроїв

| Пристрій | Sidebar | Поведінка |
|----------|---------|-----------|
| **Смартфон** (xs-sm) | Прихований (hidden) | Тільки контент прокручується |
| **Планшет** (md) | Sticky, 4 колонки | Sticky sidebar, один скрол |
| **Ноутбук** (lg-xl) | Sticky, 3 колонки | Sticky sidebar, один скрол |
| **TV** (3xl-4xl) | Sticky, більші відступи | Sticky sidebar, один скрол, більші елементи |

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/App.css` | Видалити старі конфліктні стилі Vite |
| `index.html` | Виправити стилі `html, body, #root` для єдиної прокрутки |
| `src/index.css` | Додати утиліту `.sticky-sidebar` та глобальні стилі прокрутки |
| `src/components/layout/Sidebar.tsx` | Додати `max-height` та `overflow-y: auto` з `scrollbar-hide` |
| `src/pages/Index.tsx` | Оновити класи sidebar для коректного sticky поведінки |

---

### Очікуваний результат

1. **Один скролбар** - як у Facebook, тільки справа на всю сторінку
2. **Sidebar завжди видимий** - прилипає до верху при прокрутці
3. **Стабільна сторінка** - не "стрибає" вгору
4. **Працює на всіх пристроях** - смартфони, планшети, ноутбуки, TV

