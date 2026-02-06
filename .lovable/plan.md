

## План: Виправлення бокової панелі та перейменування сторінки

---

### Проблема

На скриншоті видно, що на сторінці "Знайти контакти" (Connect) бокова панель перекривається контентом. Ця ж проблема присутня на сторінках Notifications та Settings.

```text
НЕПРАВИЛЬНО (Connect, Notifications, Settings):
┌────────────────────────────────────┐
│ Navbar                             │
├─────────┬──────────────────────────┤
│ Sidebar │ Content                  │
│ (inside │ (перекриває sidebar)     │
│  grid)  │                          │
└─────────┴──────────────────────────┘

ПРАВИЛЬНО (Index, Friends, Profile):
┌────────────────────────────────────┐
│ Navbar (fixed)                     │
├────────────────────────────────────┤
│ pt-14 sm:pt-16 (відступ для navbar)│
├─────────┬──────────────────────────┤
│ Sidebar │ Spacer  │ Content        │
│ (fixed, │ (empty) │                │
│ окремо) │         │                │
└─────────┴─────────┴────────────────┘
```

---

### Сторінки для виправлення

| Сторінка | Файл | Проблема |
|----------|------|----------|
| Знайти контакти | `Connect.tsx` | Sidebar в grid з className |
| Сповіщення | `Notifications.tsx` | Sidebar в grid з className |
| Налаштування | `Settings.tsx` | Sidebar в grid з className |

---

### Зміни по файлах

#### 1. Connect.tsx (рядки 137-143)

**До:**
```tsx
<div className="min-h-screen bg-background pb-safe-nav">
  <Navbar />
  <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
    <Sidebar className="hidden lg:block col-span-3" />
    <main className="col-span-12 lg:col-span-9">
```

**Після:**
```tsx
<div className="min-h-screen bg-background pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
  <Navbar />
  <Sidebar />
  <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
    <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
    <main className="col-span-12 md:col-span-8 lg:col-span-9">
```

**Перейменування (рядок 145):**
```tsx
// До:
<h1 className="text-3xl font-bold mb-2">Знайти контакти</h1>

// Після:
<h1 className="text-3xl font-bold mb-2">Знайти друзів</h1>
```

---

#### 2. Notifications.tsx (рядки 221-227)

**До:**
```tsx
<div className="min-h-screen bg-background pb-safe-nav">
  <Navbar />
  <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
    <Sidebar className="hidden md:block md:col-span-4 lg:col-span-3" />
    <main className="col-span-12 md:col-span-8 lg:col-span-9">
```

**Після:**
```tsx
<div className="min-h-screen bg-background pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
  <Navbar />
  <Sidebar />
  <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
    <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
    <main className="col-span-12 md:col-span-8 lg:col-span-9">
```

---

#### 3. Settings.tsx (рядки 85-94)

**До:**
```tsx
<div className="min-h-screen pb-safe-nav">
  <Navbar />
  <div className="container mt-8 grid grid-cols-12 gap-6 px-4 md:px-6">
    <div className="hidden md:block md:col-span-4 lg:col-span-3">
      <Sidebar className="sticky top-20" />
    </div>
    <main className="col-span-12 md:col-span-8 lg:col-span-9">
```

**Після:**
```tsx
<div className="min-h-screen pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
  <Navbar />
  <Sidebar />
  <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
    <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
    <main className="col-span-12 md:col-span-8 lg:col-span-9">
```

---

#### 4. translations.ts (рядок 92)

**До:**
```tsx
findContacts: "Знайти контакти",
```

**Після:**
```tsx
findContacts: "Знайти друзів",
```

---

### Підсумок змін

| Файл | Тип зміни |
|------|-----------|
| `src/pages/Connect.tsx` | Виправити layout + перейменувати заголовок |
| `src/pages/Notifications.tsx` | Виправити layout |
| `src/pages/Settings.tsx` | Виправити layout |
| `src/lib/translations.ts` | Перейменувати "Знайти контакти" → "Знайти друзів" |

---

### Результат

1. Бокова панель правильно відображатиметься на всіх сторінках
2. Сторінка "Знайти контакти" перейменована на "Знайти друзів"
3. Уніфікований layout на всіх сторінках додатку

