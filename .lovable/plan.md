
## План: Виправлення циклу редіректів після входу

---

### Причина проблеми

У `Navbar.tsx` є застарілий код (рядки 13-21), який:

1. Перевіряє чи є в localStorage ключ `currentUser`
2. Якщо є - видаляє його і редіректить на `/auth`

Але тепер `next-themes` використовує `storageKey="theme"`, і при зміні localStorage (навіть для теми) можуть відбуватися рендери, які триггерять цей useEffect.

Більш критично: цей код застарілий і більше не потрібен, бо автентифікація повністю перейшла на Supabase.

---

### Рішення

**Видалити застарілий useEffect з Navbar.tsx:**

```tsx
// ВИДАЛИТИ ЦЕЙ КОД:
React.useEffect(() => {
  if (!loading && !isAuthenticated()) {
    const localUser = localStorage.getItem('currentUser');
    if (localUser) {
      localStorage.removeItem('currentUser');
      window.location.href = '/auth';
    }
  }
}, [loading, isAuthenticated]);
```

Цей код був потрібен під час міграції з localStorage на Supabase Auth, щоб очистити старі дані. Зараз він тільки створює проблеми.

---

### Файли для редагування

| Файл | Зміна |
|------|-------|
| `src/components/layout/Navbar.tsx` | Видалити useEffect (рядки 12-22) |

---

### Новий код Navbar.tsx

```tsx
import React from "react";
import { NavbarLogo } from "./NavbarLogo";
import { NavbarNavigation } from "./NavbarNavigation";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarActions } from "./NavbarActions";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";

export function Navbar() {
  const { getCurrentUser } = useSupabaseAuth();
  const currentUser = getCurrentUser();

  // Перевіряємо чи користувач є адміністратором
  const isAdmin = (currentUser?.isAdmin === true) || (currentUser?.founder_admin === true);

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 right-0 z-50">
      <div className="container flex h-14 sm:h-16 3xl:h-20 items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <NavbarLogo />
          <NavbarNavigation isAdmin={isAdmin} />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <NavbarSearch />
          <NavbarActions />
        </div>
      </div>
    </nav>
  );
}
```

---

### Очікуваний результат

1. Після входу користувач потрапляє на головну сторінку
2. Немає циклічних редіректів
3. Автентифікація працює стабільно
