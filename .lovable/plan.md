

## План виправлення: Автор публікації не відображається (показується "Користувач")

---

### Виявлена проблема

На мобільному (та насправді на всіх пристроях) ім'я автора публікації показується як "Користувач" замість реального імені. Це відбувається тому, що **RLS policies на таблиці `users` блокують доступ до профілів інших користувачів**.

---

### Технічний аналіз

**Поточні RLS policies для таблиці `users`:**

| Policy | Команда | Умова |
|--------|---------|-------|
| `secure_admin_all_profiles_access` | SELECT | Тільки адміни |
| `secure_users_own_profile_access` | SELECT | Тільки власний профіль (`id = auth.uid()`) |

**Проблема:** Немає policy для читання публічних профілів інших користувачів.

Коли `NewsFeed.tsx` виконує запит:
```tsx
const { data: supabasePosts } = await supabase
  .from('posts')
  .select(`*, author:users!posts_user_id_fkey(*)`)
```

...JOIN з таблицею `users` блокується RLS, і `post.author` повертається як `null`. Тому спрацьовує fallback:
```tsx
const authorName = postAuthor?.full_name || 'Користувач';
```

---

### Рішення

Замість зміни RLS policies (що може створити проблеми безпеки), використаємо існуючу RPC функцію `get_safe_public_profiles_by_ids()` яка є **SECURITY DEFINER** і повертає тільки безпечні публічні поля.

---

### Зміни у файлах

#### Файл 1: `src/components/feed/NewsFeed.tsx`

**Крок 1:** Змінити запит для завантаження постів - прибрати JOIN з users:

```tsx
// БУЛО:
const { data: supabasePosts, error } = await supabase
  .from('posts')
  .select(`
    *,
    author:users!posts_user_id_fkey(*)
  `)
  .order('created_at', { ascending: false });

// СТАНЕ:
const { data: supabasePosts, error } = await supabase
  .from('posts')
  .select('*')
  .order('created_at', { ascending: false });
```

**Крок 2:** Після завантаження постів, отримати унікальні `user_id` і завантажити авторів через RPC:

```tsx
if (supabasePosts && supabasePosts.length > 0) {
  // Отримуємо унікальні ID авторів
  const authorIds = [...new Set(supabasePosts.map(p => p.user_id))];
  
  // Завантажуємо авторів через безпечну RPC функцію
  const { data: authors } = await supabase.rpc('get_safe_public_profiles_by_ids', { 
    _ids: authorIds 
  });
  
  // Додаємо авторів до постів
  const postsWithAuthors = supabasePosts.map(post => ({
    ...post,
    author: authors?.find((a: any) => a.id === post.user_id) || null
  }));
  
  setPosts(postsWithAuthors);
} else {
  setPosts([]);
}
```

---

### Візуалізація змін

```text
ЗАРАЗ (не працює через RLS):

┌─────────────────────────────────────────┐
│ SELECT * FROM posts                      │
│ JOIN users ON posts.user_id = users.id   │  ← RLS блокує!
└─────────────────────────────────────────┘
                    │
                    ▼
         author = null
                    │
                    ▼
    Показується: "Користувач" (fallback)
```

```text
ПІСЛЯ ВИПРАВЛЕННЯ:

┌─────────────────────────────────────────┐
│ 1. SELECT * FROM posts                   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 2. RPC: get_safe_public_profiles_by_ids  │  ← SECURITY DEFINER!
│    (_ids: [user_id1, user_id2, ...])     │
└─────────────────────────────────────────┘
                    │
                    ▼
         author = {full_name: "Олександр Боднарюк", ...}
                    │
                    ▼
    Показується: "Олександр Боднарюк"
```

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/components/feed/NewsFeed.tsx` | Замінити JOIN на окремий RPC запит для авторів |

---

### Очікуваний результат

1. Ім'я автора **відображається правильно** ("Олександр Боднарюк" замість "Користувач")
2. Аватар автора **завантажується**
3. Працює на **всіх пристроях** (мобільних і десктопних)
4. **Безпека збережена** - використовується SECURITY DEFINER функція

