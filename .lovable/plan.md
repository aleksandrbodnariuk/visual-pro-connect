

## План: Виправлення проблем із завантаженням сайту

---

### Діагностика проблеми

Консольні логи показують масові "Timeout" помилки:

```
Помилка завантаження постів: Timeout
Помилка або timeout завантаження налаштувань: Timeout
```

**Проблема:** Timeout 5 секунд замалий для Supabase запитів, особливо при холодному старті.

---

### Кореневі причини

| Проблема | Опис | Файли |
|----------|------|-------|
| Занадто короткий timeout | 5 сек недостатньо для Supabase | `NewsFeed.tsx`, `NavbarLogo.tsx`, `Search.tsx`, `FriendsList.tsx` |
| Застаріле використання localStorage | Сторінки використовують `localStorage.getItem("currentUser")` | `Notifications.tsx`, `Profile.tsx` |
| Неправильна поведінка при timeout | При помилці показується порожній стан без retry | Усі компоненти |

---

### Рішення

#### 1. Збільшити timeout до 15 секунд

Змінити timeout з 5000ms на 15000ms у всіх файлах:

- `src/components/feed/NewsFeed.tsx` - рядок 63
- `src/components/layout/NavbarLogo.tsx` - рядок 19
- `src/pages/Search.tsx`
- `src/components/profile/FriendsList.tsx`

```tsx
// Було:
setTimeout(() => reject(new Error('Timeout')), 5000)

// Стало:
setTimeout(() => reject(new Error('Timeout')), 15000)
```

---

#### 2. Виправити Notifications.tsx - використовувати Supabase Auth

Замінити:
```tsx
const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
```

На:
```tsx
const { data: { user } } = await supabase.auth.getUser();
if (!user?.id) {
  throw new Error("User not authenticated");
}
```

---

#### 3. Виправити Profile.tsx - видалити залежність від localStorage

Рядки 81-85 використовують localStorage як fallback:
```tsx
const localUser = localStorage.getItem('currentUser') 
  ? JSON.parse(localStorage.getItem('currentUser') || '{}') 
  : null;
```

Це потрібно видалити і покладатись тільки на `supabase.auth.getUser()`.

---

#### 4. Додати retry логіку для критичних запитів

При timeout спробувати ще раз через 2 секунди:

```tsx
const loadPostsWithRetry = async (retryCount = 0) => {
  try {
    await loadPosts();
  } catch (error) {
    if (retryCount < 2) {
      setTimeout(() => loadPostsWithRetry(retryCount + 1), 2000);
    }
  }
};
```

---

### Файли для редагування

| Файл | Зміна |
|------|-------|
| `src/components/feed/NewsFeed.tsx` | Збільшити timeout до 15 сек |
| `src/components/layout/NavbarLogo.tsx` | Збільшити timeout до 15 сек |
| `src/pages/Search.tsx` | Збільшити timeout до 15 сек |
| `src/components/profile/FriendsList.tsx` | Збільшити timeout до 15 сек |
| `src/pages/Notifications.tsx` | Замінити localStorage на supabase.auth.getUser() |
| `src/pages/Profile.tsx` | Видалити fallback на localStorage |

---

### Очікуваний результат

1. Сайт завантажується правильно без "Timeout" помилок
2. Новини та логотип відображаються коректно
3. Сторінки працюють без залежності від localStorage
4. Вхід в систему працює і редирект на головну сторінку відбувається правильно

