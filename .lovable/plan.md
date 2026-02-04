

## План: Виправлення відображення авторів, коментаторів, та скриття особистої інформації

---

### Виявлені проблеми з аналізу

1. **Автор поста показується як "Користувач"** 
   - Деякі пости мають `user_id: null` у базі даних
   - При відсутності автора fallback показує "Користувач" замість правильного імені

2. **Аватар показує "U" замість фото**
   - `currentUser` в PostCard завантажується через `useAuthState().getCurrentUser()`, яка залежить від стану `appUser`
   - Якщо `appUser` ще не завантажено - аватар показує перший символ 'U'

3. **Під ім'ям показується телефон/email (@0507068007, @bodnaryuk.halyna)**
   - Функція `getUsername()` в NewsFeed.tsx використовує `phone_number` як username
   - Це приватна інформація, що не повинна показуватися публічно

4. **Титули (Імператор, Граф) видно всім**
   - Зараз титул показується у полі `profession` в `PostCard`
   - Має показуватися тільки тим, хто є інвестором/акціонером

5. **URL-посилання на YouTube/соцмережі показується у підписі**
   - Зараз повний текст `caption` показується, включаючи URL
   - Посилання має бути скрите і доступне в меню "..."

---

### Схема проблеми з username

```text
ЗАРАЗ:
┌────────────────────────────────────────────────────────────────────────────┐
│ Олександр Боднарюк                                                         │
│ @0507068007  Імператор  ← Показує телефон та титул ВСІМ!                  │
│                                                                            │
│ [Відео]                                                                    │
│                                                                            │
│ Олександр Боднарюк https://www.youtube.com/watch?v=... ← URL видно!       │
└────────────────────────────────────────────────────────────────────────────┘

МАЄ БУТИ:
┌────────────────────────────────────────────────────────────────────────────┐
│ Олександр Боднарюк                                                         │
│ @олександр  ← Ім'я як username, БЕЗ телефону                               │
│                                                                            │
│ [Відео]                                                                    │
│                                                                            │
│ Олександр Боднарюк ← Тільки ім'я, БЕЗ URL                                 │
│ [Меню ...] → Посилання: https://www.youtube.com/watch?v=...               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Технічні зміни

---

### Файл 1: `src/components/feed/NewsFeed.tsx`

#### 1.1 Виправити функцію `getUsername()` - не показувати телефон/email

```tsx
const getUsername = (user: any) => {
  if (!user) return 'user';
  
  // Використовуємо тільки full_name, НЕ phone_number
  // Беремо перше ім'я як username
  const firstName = user.full_name?.split(' ')[0];
  if (firstName) {
    return firstName.toLowerCase();
  }
  
  return 'user';
};
```

#### 1.2 Не передавати титул як `profession` для всіх

Рядок 410: Прибрати `profession` з props (буде оброблятися в PostCard):
```tsx
author={{
  id: post.user_id,
  name: authorName,
  username: getUsername(postAuthor),
  avatarUrl: postAuthor?.avatar_url || postAuthor?.avatarUrl || '',
  // Не передаємо profession/title тут - буде перевірятися в PostCard
}}
```

---

### Файл 2: `src/components/feed/PostCard.tsx`

#### 2.1 Додати перевірку чи поточний користувач є інвестором для показу титулів

```tsx
// Перевіряємо чи поточний користувач є інвестором (акціонером)
const isCurrentUserInvestor = authUser?.isShareHolder || authUser?.is_shareholder;

// В рендері:
{author.profession && isCurrentUserInvestor && (
  <span className="profession-badge...">
    {author.profession}
  </span>
)}
```

#### 2.2 Скрити URL у caption, показати тільки текст без посилання

Створити функцію для видалення URL:
```tsx
const removeUrls = (text: string): string => {
  return text.replace(/(https?:\/\/[^\s]+)/g, '').trim();
};

// У рендері caption:
const cleanCaption = removeUrls(caption);
<p className="text-sm">
  <Link to={`/profile/${author.id}`} className="font-semibold">
    {author.name}
  </Link>{" "}
  {cleanCaption || '(посилання)'}
</p>
```

#### 2.3 Додати пункт меню "Посилання" в PostMenu

Передавати `caption` до PostMenu:
```tsx
<PostMenu 
  postId={id}
  isAuthor={isAuthor}
  onEdit={onEdit}
  onDelete={onDelete}
  caption={caption}  // Для отримання URL
/>
```

---

### Файл 3: `src/components/profile/PostMenu.tsx`

#### 3.1 Додати пункт меню "Копіювати посилання на медіа"

```tsx
interface PostMenuProps {
  postId: string;
  isAuthor: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  caption?: string;  // Для отримання URL з тексту
}

// Функція для витягування URL
const extractUrl = (text?: string): string | null => {
  if (!text) return null;
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : null;
};

// Новий обробник:
const handleCopyMediaLink = () => {
  const url = extractUrl(caption);
  if (url) {
    navigator.clipboard.writeText(url);
    toast.success("Посилання на медіа скопійовано");
  }
};

// У меню додати новий пункт (тільки якщо є URL):
{extractUrl(caption) && (
  <DropdownMenuItem onClick={handleCopyMediaLink} className="flex items-center cursor-pointer">
    <ExternalLink className="mr-2 h-4 w-4" />
    Копіювати посилання на медіа
  </DropdownMenuItem>
)}
```

---

### Файл 4: `src/components/feed/NewsFeed.tsx` - Виправити завантаження аватара currentUser

#### 4.1 Переконатися що `currentUser` коректно завантажується

Функція `loadCurrentUser` вже використовує `supabase.auth.getUser()` та запит до таблиці users - це правильно. Але потрібно переконатися, що `currentUser` передається до `PostCard` і використовується.

У PostCard рядок 289-291:
```tsx
<Avatar className="h-8 w-8">
  <AvatarImage src={authUser?.avatar_url || authUser?.avatarUrl || ''} />
  <AvatarFallback>{authUser?.full_name?.[0] || authUser?.firstName?.[0] || 'U'}</AvatarFallback>
</Avatar>
```

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/components/feed/NewsFeed.tsx` | `getUsername()` використовує тільки ім'я, не телефон; не передавати `profession` |
| `src/components/feed/PostCard.tsx` | Скрити URL у caption; показувати титули тільки інвесторам; виправити fallback аватара |
| `src/components/profile/PostMenu.tsx` | Додати пункт "Копіювати посилання на медіа" |

---

### Очікуваний результат

1. **Ім'я автора** - завжди `full_name`, ніколи "Користувач" (окрім випадків коли `user_id` null)
2. **Username** - перше ім'я (`@олександр`), НЕ телефон/email
3. **Аватар** - коректний аватар з БД, перша літера імені як fallback
4. **Титули** - видно тільки інвесторам/акціонерам
5. **URL в caption** - скриті, доступні через меню "..." → "Копіювати посилання на медіа"

---

### Візуальна схема результату

```text
БУЛО:
┌─────────────────────────────────────┐
│ 👤 Користувач                       │
│    @0507068007  Імператор           │
│ ─────────────────────────────────── │
│ Користувач https://youtu.be/xxx     │
│                                     │
│ 👤 U | Написати коментар...         │
└─────────────────────────────────────┘

СТАНЕ:
┌─────────────────────────────────────┐
│ 🖼️ Олександр Боднарюк               │
│    @олександр                       │
│ ─────────────────────────────────── │
│ Олександр Боднарюк (посилання)      │
│                                     │
│ 🖼️ Написати коментар...             │
│                                     │
│ [Меню ...]                          │
│ ├─ Копіювати посилання на медіа     │
│ └─ Поділитися                       │
└─────────────────────────────────────┘
```

