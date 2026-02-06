

## План: Зменшення відстані між ім'ям і текстом коментаря

---

### Аналіз проблеми

Порівнюючи скриншоти:

| Елемент | У нас | У Facebook |
|---------|-------|------------|
| Ім'я користувача | Окремий рядок у `<div>` | На одному рядку з текстом |
| Текст коментаря | Окремий `<p>` на новому рядку | Одразу після імені |
| Візуальний ефект | Великий вертикальний проміжок | Компактно, все в один потік |

---

### Поточна структура (рядки 60-73)

```tsx
<div className="bg-muted/50 rounded-2xl px-3 py-1.5 inline-block max-w-full">
  <div className="flex items-center gap-2 flex-wrap">  <!-- Ім'я на окремому рядку -->
    <Link>Ім'я</Link>
    <Badge>Автор</Badge>
  </div>
  <p className="text-sm break-words">{comment.content}</p>  <!-- Текст на новому рядку -->
</div>
```

---

### Рішення: Об'єднати ім'я і текст в один потік

**Файл:** `src/components/feed/CommentItem.tsx`

```tsx
<div className="bg-muted/50 rounded-2xl px-3 py-1.5 inline-block max-w-full">
  <p className="text-sm break-words">
    <Link 
      to={`/profile/${comment.user_id}`} 
      className="font-semibold text-xs hover:underline mr-1"
    >
      {comment.user?.full_name || 'Користувач'}
    </Link>
    {isPostAuthor && (
      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 mr-1 align-middle">
        Автор
      </Badge>
    )}
    <span>{comment.content}</span>
  </p>
</div>
```

---

### Візуальне порівняння

```text
ДО:                           ПІСЛЯ (як у Facebook):
┌─────────────────────┐       ┌─────────────────────┐
│ Олександр Боднарюк  │       │ Олександр Боднарюк  │
│                     │       │ Клас                │
│ Клас                │       └─────────────────────┘
└─────────────────────┘       
```

---

### Технічні зміни

| Рядки | Було | Стане |
|-------|------|-------|
| 60-73 | Два окремі `<div>` і `<p>` | Один `<p>` з inline елементами |

---

### Очікуваний результат

1. Ім'я та коментар на одному рівні (inline)
2. Бейдж "Автор" залишається поруч з ім'ям
3. Компактний вигляд як у Facebook
4. Коректний перенос тексту при довгих коментарях

