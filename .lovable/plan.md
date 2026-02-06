

## План: Система "Фахівців" (Specialists) та виправлення "@user"

---

### Огляд проблем

1. **"@user_xxx"** - у картках професіоналів показується фейковий username замість реальних даних
2. **Всі користувачі у пошуку** - сторінка Search показує всіх користувачів, а не тільки фахівців
3. **Немає ролі "Фахівець"** - відсутній механізм визначення хто є фахівцем

---

### Рішення

| Компонент | Дія |
|-----------|-----|
| База даних | Додати роль `specialist` до enum `app_role` |
| RPC функція | Створити `get_specialists()` для пошуку тільки фахівців |
| Search.tsx | Видалити "@user", фільтрувати тільки фахівців |
| Profile.tsx | Обмежити портфоліо тільки для фахівців |
| UsersTab.tsx | Додати перемикач "Фахівець" |

---

### Візуальна схема

```text
ЗВИЧАЙНИЙ КОРИСТУВАЧ:
┌─────────────────────────────┐
│ - Публікації ✓              │
│ - Портфоліо ✗ (недоступно)  │
│ - НЕ в пошуку фахівців      │
└─────────────────────────────┘

ФАХІВЕЦЬ (Specialist):
┌─────────────────────────────┐
│ - Публікації ✓              │
│ - Портфоліо ✓               │
│ - Відображається в пошуку   │
│ - Має категорії             │
└─────────────────────────────┘
```

---

### Детальні технічні зміни

#### 1. Міграція бази даних

```sql
-- Додати роль 'specialist' до enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'specialist';
```

#### 2. Нова RPC функція `get_specialists()`

```sql
CREATE OR REPLACE FUNCTION public.get_specialists()
RETURNS TABLE(
  id uuid, 
  full_name text, 
  avatar_url text, 
  title text, 
  bio text, 
  categories text[], 
  city text, 
  country text, 
  created_at timestamp
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.full_name, u.avatar_url, u.title, u.bio,
    u.categories, u.city, u.country, u.created_at
  FROM public.users u
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = u.id AND role = 'specialist'
  )
  ORDER BY u.created_at DESC;
END;
$$;
```

---

#### 3. Search.tsx - Виправлення карток

**Видалити** (рядок 113):
```tsx
username: `user_${user.id.substring(0, 8)}`,
```

**Видалити** (рядки 308-310):
```tsx
<span className="text-sm text-muted-foreground">
  {professional.username ? `@${professional.username.substring(0, 8)}` : ""}
</span>
```

**Змінити RPC виклик** (рядок 100-101):
```tsx
// ДО:
const { data, error } = await supabase.rpc('get_safe_public_profiles');

// ПІСЛЯ:
const { data, error } = await supabase.rpc('get_specialists');
```

---

#### 4. UsersTab.tsx - Перемикач "Фахівець"

Додати нову колонку після "Акціонер":

```tsx
// Заголовок (в grid)
<div>Фахівець</div>

// Перемикач
<SpecialistToggle user={user} onToggleSpecialist={toggleSpecialistStatus} />
```

Логіка перемикача:
```tsx
const toggleSpecialistStatus = async (userId: string) => {
  const currentStatus = hasSpecialistRole(userId);
  
  if (newStatus) {
    await supabase.from('user_roles')
      .upsert({ user_id: userId, role: 'specialist' });
  } else {
    await supabase.from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'specialist');
  }
};
```

---

#### 5. Profile.tsx - Обмеження портфоліо

```tsx
// ДО: Показується всім
<TabsTrigger value="portfolio">Портфоліо</TabsTrigger>

// ПІСЛЯ: Тільки для фахівців
{isSpecialist && (
  <TabsTrigger value="portfolio">Портфоліо</TabsTrigger>
)}
```

Визначення статусу:
```tsx
const [isSpecialist, setIsSpecialist] = useState(false);

// Перевірка ролі
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .eq('role', 'specialist')
  .single();

setIsSpecialist(!!data);
```

---

#### 6. SearchCategories.tsx - Лічильники фахівців

```tsx
// Замінити виклик RPC
const { data, error } = await supabase.rpc('get_specialists');
```

---

### Нові компоненти

| Файл | Опис |
|------|------|
| `src/components/admin/users/SpecialistToggle.tsx` | Перемикач статусу фахівця |

---

### Файли для редагування

| Файл | Зміни |
|------|-------|
| `src/pages/Search.tsx` | Видалити "@user", змінити RPC |
| `src/pages/Profile.tsx` | Обмежити вкладку портфоліо |
| `src/components/admin/tabs/UsersTab.tsx` | Додати колонку "Фахівець" |
| `src/components/search/SearchCategories.tsx` | Змінити RPC |
| `src/components/admin/users/SpecialistToggle.tsx` | Новий компонент |
| `supabase/migrations/xxx.sql` | Міграція: enum + функція |
| `src/integrations/supabase/types.ts` | Оновити типи |

---

### Результат

1. Видалено "@user" з карток професіоналів
2. У пошуку фахівців відображаються тільки користувачі з роллю `specialist`
3. Вкладка "Портфоліо" доступна тільки фахівцям
4. Адміністратор може надавати/знімати статус фахівця через адмін-панель
5. Лічильники категорій відображають тільки фахівців

