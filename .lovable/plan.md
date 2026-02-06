

## План: Зменшення відстані між ім'ям і текстом коментаря до рівня Facebook

---

### Аналіз проблеми

Порівнюючи скриншоти:

| Елемент | У Facebook | У нас |
|---------|------------|-------|
| Відстань ім'я-текст | ~0-2px | ~12-16px |
| Line-height | Дуже щільний | Стандартний (1.5) |
| Структура | Компактно злито | Роздуто |

---

### Причини великого проміжку

1. **`flex items-center`** у div з ім'ям створює висоту більшу ніж потрібно
2. **Стандартний `line-height`** для `<p>` (text-sm) = 1.25rem (20px)
3. **Два блочні елементи** (`<div>` + `<p>`) створюють вертикальний стек з проміжком

---

### Рішення

**Файл:** `src/components/feed/CommentItem.tsx` (рядки 59-74)

```tsx
<div className="bg-muted/50 rounded-2xl px-3 py-1.5 inline-block max-w-full">
  {/* Ім'я - з мінімальним line-height */}
  <span className="flex items-center gap-1 leading-tight">
    <Link 
      to={`/profile/${comment.user_id}`} 
      className="font-semibold text-xs hover:underline"
    >
      {comment.user?.full_name || 'Користувач'}
    </Link>
    {isPostAuthor && (
      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
        Автор
      </Badge>
    )}
  </span>
  {/* Текст - з мінімальним line-height */}
  <p className="text-sm break-words leading-snug">{comment.content}</p>
</div>
```

---

### Ключові зміни

| Елемент | Було | Стане |
|---------|------|-------|
| Контейнер імені | `<div>` без line-height | `<span>` з `leading-tight` |
| Текст коментаря | `<p>` стандартний | `<p>` з `leading-snug` |

**Tailwind класи:**
- `leading-tight` = line-height: 1.25 (мінімальний)
- `leading-snug` = line-height: 1.375 (трохи щільніший за стандартний)

---

### Візуальне порівняння

```text
ДО (великий проміжок):        ПІСЛЯ (як у Facebook):
┌─────────────────────┐       ┌─────────────────────┐
│ Davv Bod            │       │ Davv Bod            │
│                     │       │ Cool                │
│ Cool                │       └─────────────────────┘
└─────────────────────┘       
```

---

### Файл для редагування

| Файл | Рядки | Зміни |
|------|-------|-------|
| `src/components/feed/CommentItem.tsx` | 59-74 | Додати `leading-tight` до div з ім'ям, `leading-snug` до тексту |

---

### Очікуваний результат

1. Ім'я і текст коментаря щільно один під одним
2. Мінімальний проміжок як у Facebook
3. Компактні бульбашки коментарів

