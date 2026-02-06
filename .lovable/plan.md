

## План: Реалізація вкладених коментарів (відповіді на коментарі) у стилі Facebook

---

### Поточний стан

Таблиця `comments` має такі поля:
- `id` - UUID
- `post_id` - посилання на пост
- `user_id` - автор коментаря
- `content` - текст
- `created_at` - дата створення

**Немає поля для зв'язку з батьківським коментарем.**

---

### Архітектура рішення

```text
┌─────────────────────────────────────────────┐
│ Коментар 1 (parent_id = NULL)               │
│ 👤 Валентина Пушкар                          │
│ "Саша на цих фото схожий на ФРЕДИ"          │
│ [Подобається] [Відповісти]                  │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │ Відповідь (parent_id = Коментар 1)  │   │
│   │ 👤 Олександр Дідик                   │   │
│   │ "Була така гітара? Урал?"           │   │
│   │ [Подобається] [Відповісти]          │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │ Відповідь (parent_id = Коментар 1)  │   │
│   │ 🔑 Автор                             │   │
│   │ 👤 Олександр Боднарюк               │   │
│   │ "У сільських клубах..."             │   │
│   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

### Частина 1: Зміни в базі даних

#### Додати колонку `parent_id` до таблиці comments

```sql
-- Додати колонку parent_id для вкладених коментарів
ALTER TABLE public.comments 
ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Індекс для швидкого пошуку відповідей
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
```

---

### Частина 2: Оновити TypeScript типи

Файл: `src/integrations/supabase/types.ts`

```typescript
comments: {
  Row: {
    content: string
    created_at: string | null
    id: string
    post_id: string
    user_id: string
    parent_id: string | null  // ← Додати
  }
  Insert: {
    content: string
    created_at?: string | null
    id?: string
    post_id: string
    user_id: string
    parent_id?: string | null  // ← Додати
  }
  Update: {
    content?: string
    created_at?: string | null
    id?: string
    post_id?: string
    user_id?: string
    parent_id?: string | null  // ← Додати
  }
}
```

---

### Частина 3: Оновити інтерфейс CommentData

Файл: `src/components/feed/PostCard.tsx`

```typescript
interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id?: string | null;  // ← Додати
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  replies?: CommentData[];  // ← Вкладені відповіді
}
```

---

### Частина 4: Додати стан для відповіді

```typescript
const [replyingTo, setReplyingTo] = useState<{
  commentId: string;
  userName: string;
} | null>(null);
```

---

### Частина 5: Функція групування коментарів

```typescript
const groupCommentsWithReplies = (comments: CommentData[]): CommentData[] => {
  // Спочатку отримуємо кореневі коментарі (parent_id = null)
  const rootComments = comments.filter(c => !c.parent_id);
  
  // Додаємо відповіді до кожного кореневого коментаря
  return rootComments.map(root => ({
    ...root,
    replies: comments.filter(c => c.parent_id === root.id)
  }));
};
```

---

### Частина 6: Оновити запит коментарів

```typescript
const loadRecentComments = async () => {
  // Завантажуємо всі коментарі (включно з відповідями)
  const { data: commentsData } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: true }); // Від старих до нових

  // Групуємо в ієрархію
  const grouped = groupCommentsWithReplies(commentsWithUsers);
  setRecentComments(grouped.slice(-2)); // Останні 2 кореневі
};
```

---

### Частина 7: Оновити форму відправки коментаря

```typescript
const handleCommentSubmit = async () => {
  await supabase.from('comments').insert({
    post_id: id,
    user_id: authUser.id,
    content: commentText.trim(),
    parent_id: replyingTo?.commentId || null  // ← Додати parent_id
  });
  
  setReplyingTo(null);
  setCommentText("");
};
```

---

### Частина 8: UI для коментаря з відповідями

```tsx
{/* Компонент одного коментаря */}
const CommentItem = ({ comment, depth = 0 }: { comment: CommentData; depth?: number }) => (
  <div className={cn("flex items-start gap-2", depth > 0 && "ml-8 mt-2")}>
    <Avatar className="h-6 w-6">
      <AvatarImage src={comment.user?.avatar_url} />
      <AvatarFallback>{comment.user?.full_name?.[0]}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <div className="bg-muted/50 rounded-2xl px-3 py-1.5">
        <span className="font-semibold text-xs">{comment.user?.full_name}</span>
        <p className="text-sm">{comment.content}</p>
      </div>
      
      {/* Дії під коментарем */}
      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
        <span>{formatTimeAgo(comment.created_at)}</span>
        <button className="hover:underline font-medium">Подобається</button>
        <button 
          onClick={() => setReplyingTo({ commentId: comment.id, userName: comment.user?.full_name })}
          className="hover:underline font-medium"
        >
          Відповісти
        </button>
      </div>
      
      {/* Вкладені відповіді */}
      {comment.replies?.map(reply => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  </div>
);
```

---

### Частина 9: Показувати кому відповідаємо

```tsx
{replyingTo && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
    <span>Відповідь для {replyingTo.userName}</span>
    <button onClick={() => setReplyingTo(null)} className="text-destructive">
      ✕ Скасувати
    </button>
  </div>
)}
```

---

### Файли для редагування

| Файл | Зміни |
|------|-------|
| Міграція SQL | Додати колонку `parent_id` |
| `src/integrations/supabase/types.ts` | Додати `parent_id` до типів comments |
| `src/components/feed/PostCard.tsx` | Повна реалізація вкладених коментарів |

---

### Очікуваний результат

1. Під кожним коментарем є кнопка "Відповісти"
2. Відповіді показуються з відступом під батьківським коментарем
3. При відповіді показується "@ім'я" кому відповідаємо
4. Автор поста позначається бейджем "Автор" (як на скриншоті)
5. Ієрархія коментарів зберігається у БД через `parent_id`

