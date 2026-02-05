

## План: Фіксована верхня панель (Navbar)

---

### Проблема

Navbar використовує `sticky top-0`, але через структуру DOM або прокрутку сторінки він ховається за верхній край екрана.

---

### Рішення

Змінити позиціонування з `sticky` на `fixed`:

---

### Зміни у файлах

#### Файл 1: `src/components/layout/Navbar.tsx`

Замінити `sticky` на `fixed` та додати `w-full`:

```tsx
// БУЛО:
<nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">

// СТАНЕ:
<nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 right-0 z-50">
```

---

#### Файл 2: `src/pages/Index.tsx`

Додати відступ зверху для контенту, щоб він не ховався під фіксованим Navbar:

```tsx
// Додати padding-top до контейнера
<div className="container ... pt-16 sm:pt-20 3xl:pt-24">
```

---

#### Файл 3: `src/pages/Profile.tsx`

Аналогічно додати відступ зверху.

---

#### Файл 4: Інші сторінки

Перевірити та додати відступ на всіх сторінках які використовують Navbar.

---

### Очікуваний результат

1. Navbar **завжди видимий** зверху екрану
2. Стрічка новин прокручується **під** Navbar
3. Контент не обрізається фіксованою панеллю

