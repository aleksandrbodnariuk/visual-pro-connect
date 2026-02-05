

## План: Реалізація коментарів у стилі Facebook (inline expand)

---

### Виявлені проблеми

| Проблема | Опис | Файл |
|----------|------|------|
| Перехід на окрему сторінку | Кнопка коментаря переводить на `/post/:id` замість розкриття inline | `PostCard.tsx:218` |
| Видимий URL | На сторінці Post.tsx URL показується без очищення | `Post.tsx:246` |
| Логіка "Переглянути більше" хибна | Порівнюється `comments` з 2, але коментарі можуть не завантажитись | `PostCard.tsx:288` |
| Окрема форма коментаря | На Post.tsx форма в Card замість inline | `Post.tsx:277-305` |

---

### Рішення: Facebook-style inline коментарі

#### Поведінка як у Facebook:

```text
┌─────────────────────────────────┐
│ Пост                             │
├─────────────────────────────────┤
│ ❤️ 💬 🔗         🔖              │
│ 4 вподобань                      │
│                                  │
│ Переглянути більше коментарів ← кнопка expand
│                                  │
│ 👤 Коментар 1                    │
│ 👤 Коментар 2                    │
│ ──────────────────               │
│ 👤 Написати коментар...          │ ← inline input
└─────────────────────────────────┘

КЛІК "Переглянути більше":
- Коментарі розкриваються В ТІЙ САМІЙ КАРТЦІ
- БЕЗ переходу на іншу сторінку
- БЕЗ модального вікна
```

---

### Технічні зміни

#### 1. Додати стан `showAllComments` в PostCard.tsx

```tsx
const [showAllComments, setShowAllComments] = useState(false);
const [allComments, setAllComments] = useState<CommentData[]>([]);
```

---

#### 2. Функція завантаження всіх коментарів

```tsx
const loadAllComments = async () => {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: false });
  
  // ... fetch user data
  setAllComments(commentsWithUsers);
  setShowAllComments(true);
};
```

---

#### 3. Змінити кнопку MessageCircle

Замість:
```tsx
onClick={() => navigate(`/post/${id}`)}
```

На:
```tsx
onClick={() => {
  // Фокус на поле вводу коментаря
  commentInputRef.current?.focus();
}}
```

---

#### 4. Кнопка "Переглянути більше коментарів"

Замість Link на `/post/${id}`:
```tsx
{comments > 2 && !showAllComments && (
  <button 
    onClick={loadAllComments}
    className="text-sm text-muted-foreground hover:underline"
  >
    Переглянути ще {comments - 2} коментарів
  </button>
)}
```

---

#### 5. Відображення коментарів

```tsx
{/* Показуємо 2 останніх або всі */}
{(showAllComments ? allComments : recentComments.slice(0, 2)).map(comment => (
  // ... render comment
))}
```

---

#### 6. Очистити URL на сторінці Post.tsx (backup)

Рядок 246:
```tsx
{post.content && (
  <p className="mb-4 text-foreground">{removeUrls(post.content)}</p>
)}
```

Та додати VideoPreview якщо є embed.

---

### Файли для редагування

| Файл | Зміни |
|------|-------|
| `src/components/feed/PostCard.tsx` | Додати inline expand коментарів |
| `src/pages/Post.tsx` | Очистити URL, додати VideoPreview |

---

### Очікуваний результат

1. Коментарі розкриваються inline при натисканні "Переглянути більше"
2. Немає переходу на окрему сторінку для коментарів
3. Кнопка коментаря фокусує поле вводу
4. URL не показується в тексті поста
5. VideoPreview відображається замість голого URL
6. Сторінка Post.tsx залишається як backup (для прямих посилань)

