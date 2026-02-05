

## План: Виправлення зависання сайту

---

### Діагностика

На скриншотах видно:
1. Сторінка друзів застряла на "Завантаження списку друзів..."
2. Головна сторінка показує skeleton loaders замість контенту
3. Preview застряг на завантаженні

**Кореневі причини:**

| Проблема | Файл | Опис |
|----------|------|------|
| RPC зависає | `Search.tsx`, `NewsFeed.tsx` | `get_safe_public_profiles` виконується надто довго |
| Застарілий localStorage | `useDataSync.ts` | Шукає `currentUser` в localStorage замість Supabase Auth |
| Немає timeout у запитах | `NewsFeed.tsx`, `FriendsList.tsx` | Запити можуть зависати нескінченно |
| Каскад проблем | Усі компоненти | Один повільний запит блокує весь UI |

---

### Рішення

#### 1. Оновити useDataSync.ts - видалити застарілий localStorage

Використовувати `supabase.auth.getUser()` замість `localStorage.getItem('currentUser')`:

```tsx
const syncDataOnStartup = useCallback(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return; // Немає авторизованого користувача
    }
    // ... решта коду
  }
}, []);
```

---

#### 2. Додати timeout для критичних запитів

Обгорнути довгі запити в `Promise.race` з timeout:

```tsx
const fetchWithTimeout = async (promise: Promise<any>, ms: number = 5000) => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};
```

---

#### 3. Оптимізувати NewsFeed.tsx

- Показувати контент одразу (без skeleton якщо є кешовані дані)
- Додати timeout 5 секунд для завантаження постів
- Fallback до порожнього масиву при помилці

```tsx
const loadPosts = async () => {
  try {
    setLoading(true);
    
    const postsPromise = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Timeout 5 секунд
    const { data, error } = await Promise.race([
      postsPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    
    // ... обробка даних
  } catch (error) {
    console.error("Error:", error);
    setPosts([]); // Показати порожній список
  } finally {
    setLoading(false);
  }
};
```

---

#### 4. Оптимізувати Search.tsx

- Додати timeout для RPC `get_safe_public_profiles`
- Показувати "Не вдалося завантажити" замість нескінченного спінера

---

#### 5. Оптимізувати FriendsList.tsx

- Не блокувати UI якщо користувач не авторизований
- Додати timeout для запитів друзів

---

### Файли для редагування

| Файл | Зміна |
|------|-------|
| `src/hooks/useDataSync.ts` | Замінити localStorage на supabase.auth.getUser() |
| `src/components/feed/NewsFeed.tsx` | Додати timeout 5 сек для завантаження постів |
| `src/pages/Search.tsx` | Додати timeout для RPC запиту |
| `src/hooks/friends/useFetchFriends.ts` | Додати timeout для запитів друзів |

---

### Технічні деталі

Створити допоміжну функцію `fetchWithTimeout`:

```tsx
// src/lib/utils.ts або окремий файл
export async function fetchWithTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 5000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}
```

---

### Очікуваний результат

1. Сайт не зависає на нескінченному завантаженні
2. Якщо запит зависає > 5 секунд - показується fallback UI
3. Авторизовані користувачі бачать контент швидко
4. Неавторизовані користувачі бачать публічний контент без затримок

