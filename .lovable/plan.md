
## План: Виправлення бокової панелі на сторінці Друзі

---

### Проблема

Сторінка Friends.tsx має неправильну структуру layout, яка відрізняється від Index.tsx та Profile.tsx:

```text
ПОТОЧНИЙ СТАН (Friends.tsx):
┌────────────────────────────────────┐
│ Navbar                             │
├─────────┬──────────────────────────┤
│ Sidebar │ Main Content             │
│ (inside │ (перекриває sidebar)     │
│  grid)  │                          │
└─────────┴──────────────────────────┘

ПРАВИЛЬНИЙ СТАН (Index.tsx, Profile.tsx):
┌────────────────────────────────────┐
│ Navbar (fixed)                     │
├────────────────────────────────────┤
│ pt-14 (padding-top для navbar)     │
├─────────┬──────────────────────────┤
│ Sidebar │ Spacer  │ Main Content   │
│ (fixed, │ (empty) │                │
│ окремо) │         │                │
└─────────┴─────────┴────────────────┘
```

---

### Помилки у Friends.tsx

1. **Відсутній `pt-14 sm:pt-16 3xl:pt-20`** - контент перекривається Navbar
2. **Sidebar передає className** який перезаписує `fixed` на `sticky`
3. **Відсутній порожній spacer div** для резервування місця

---

### Рішення

Оновити структуру Friends.tsx за зразком Index.tsx:

| Елемент | Зміна |
|---------|-------|
| Root div | Додати `pt-14 sm:pt-16 3xl:pt-20` |
| Sidebar | Рендерити окремо без className |
| Grid | Додати spacer div з `aria-hidden="true"` |

---

### Технічні зміни

**Файл: `src/pages/Friends.tsx`**

```tsx
// ДО:
<div className="min-h-screen bg-background pb-safe-nav">
  <Navbar />
  <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
    <Sidebar className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-20 h-fit" />
    <main className="col-span-12 md:col-span-8 lg:col-span-9">

// ПІСЛЯ:
<div className="min-h-screen bg-background pb-safe-nav pt-14 sm:pt-16 3xl:pt-20">
  <Navbar />
  <Sidebar />
  <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
    <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
    <main className="col-span-12 md:col-span-8 lg:col-span-9">
```

---

### Результат

- Sidebar буде fixed з лівого боку (як на інших сторінках)
- Контент не буде перекриватися Navbar
- Уніфікований layout на всіх сторінках
