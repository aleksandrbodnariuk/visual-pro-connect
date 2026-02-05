
## План: Виправлення відображення телефону в адмін-панелі

---

### Проблема

Колонка "Телефон" показує email замість номера телефону, тому що:

1. Тригер `handle_new_user()` записує `COALESCE(phone, email)` в `phone_number`
2. При реєстрації через email поле `auth.users.phone` є NULL
3. Тому в `users.phone_number` потрапляє email

**Дані в базі:**
| phone_number | email |
|--------------|-------|
| zahyst77@gmail.com | zahyst77@gmail.com |
| 0507068007 | aleksandrbodnariuk@gmail.com |

---

### Рішення

#### Частина 1: Оновити логіку відображення телефону

**Файл: `src/components/admin/tabs/UsersTab.tsx`**

Замінити просте відображення `user.phone_number` на логіку перевірки:

```tsx
// Рядок 395 (до):
<div>{user.phone_number || 'Не вказано'}</div>

// Рядок 395 (після):
<div>{isValidPhoneNumber(user.phone_number) ? user.phone_number : 'Не вказано'}</div>
```

Додати функцію валідації номера телефону:

```tsx
// Перевіряє чи це номер телефону, а не email
const isValidPhoneNumber = (value: string | null | undefined): boolean => {
  if (!value) return false;
  // Якщо містить @ - це email, не телефон
  if (value.includes('@')) return false;
  // Перевіряємо що містить тільки цифри та можливо + або пробіли
  return /^[\d\s\+\-\(\)]+$/.test(value);
};
```

---

#### Частина 2: Оновити RPC для окремих полів

**SQL: Оновити функцію `get_users_for_admin()`**

Змінити логіку повернення `phone_number` щоб не повертати email:

```sql
-- Замість:
u.phone_number::text,

-- Використати:
CASE 
  WHEN u.phone_number IS NOT NULL 
       AND u.phone_number NOT LIKE '%@%' 
  THEN u.phone_number::text 
  ELSE NULL 
END as phone_number,
```

---

#### Частина 3: Оновити тригер для нових користувачів

**SQL: Виправити `handle_new_user()`**

Записувати в `phone_number` тільки реальний телефон, не email:

```sql
-- Замість:
phone_number,
...
COALESCE(NEW.phone, NEW.email, 'user_' || auth.uid()::text),

-- Використати:
phone_number,
...
NEW.phone,  -- Тільки телефон, NULL якщо немає
```

---

### Файли для зміни

| Файл/Об'єкт | Зміни |
|-------------|-------|
| `src/components/admin/tabs/UsersTab.tsx` | Додати функцію `isValidPhoneNumber()`, оновити відображення |
| SQL функція `get_users_for_admin()` | Фільтрувати email з phone_number |
| SQL тригер `handle_new_user()` | Записувати тільки phone, не email |

---

### Очікуваний результат

| ID | Email | Телефон (до) | Телефон (після) |
|----|-------|--------------|-----------------|
| 6275b15f... | zahyst77@gmail.com | zahyst77@gmail.com | Не вказано |
| c836df06... | aleksandrbodnariuk@gmail.com | 0507068007 | 0507068007 |

---

### Візуалізація

```text
ЗАРАЗ (помилка):

ID        | Email                    | Телефон
----------|--------------------------|-------------------------
6275...   | zahyst77@gmail.com       | zahyst77@gmail.com  ← Дублюється!


ПІСЛЯ ВИПРАВЛЕННЯ:

ID        | Email                    | Телефон
----------|--------------------------|-------------------------
6275...   | zahyst77@gmail.com       | Не вказано
c836...   | aleksandr...@gmail.com   | 0507068007
```
