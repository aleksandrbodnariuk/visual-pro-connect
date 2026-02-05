

## План: Відновлення та збереження номерів телефонів

---

### Поточний стан даних

| Користувач | Зараз у phone_number | Реальний телефон (meta_phone) |
|------------|---------------------|-------------------------------|
| zahyst77@gmail.com | zahyst77@gmail.com ❌ | +380737068007 ✅ |
| robloxdav72@gmail.com | robloxdav72@gmail.com ❌ | +380934926771 ✅ |
| bodnaryuk.halyna@gmail.com | bodnaryuk.halyna@gmail.com ❌ | +380635158755 ✅ |
| aleksandrbodnariuk8@gmail.com | aleksandrbodnariuk8@gmail.com ❌ | 0687068007 ✅ |
| aleksandrbodnariuk@gmail.com | 0507068007 ✅ | +380507068007 ✅ |

**Висновок:** Всі телефони збережені в `auth.users.raw_user_meta_data->>'phone'`

---

### Рішення

#### Частина 1: SQL міграція для відновлення телефонів

Оновити `public.users.phone_number` даними з `auth.users.raw_user_meta_data->>'phone'`:

```sql
UPDATE public.users u
SET phone_number = au.raw_user_meta_data->>'phone'
FROM auth.users au
WHERE u.id = au.id
  AND au.raw_user_meta_data->>'phone' IS NOT NULL
  AND au.raw_user_meta_data->>'phone' != '';
```

---

#### Частина 2: Оновити тригер handle_new_user()

Змінити логіку щоб брати телефон з metadata:

```sql
-- Замість:
NEW.phone,

-- Використати:
COALESCE(
  NEW.phone,
  user_meta->>'phone'
),
```

Це забезпечить що телефон береться або з `auth.users.phone` або з `raw_user_meta_data->>'phone'`.

---

#### Частина 3: Оновити функцію get_users_for_admin()

Додати fallback на metadata для відображення:

```sql
CASE 
  WHEN u.phone_number IS NOT NULL 
       AND u.phone_number NOT LIKE '%@%' 
  THEN u.phone_number::text
  WHEN au.raw_user_meta_data->>'phone' IS NOT NULL
  THEN au.raw_user_meta_data->>'phone'
  ELSE NULL 
END as phone_number,
```

---

### Очікуваний результат

| Користувач | Телефон (після) |
|------------|-----------------|
| zahyst77@gmail.com | +380737068007 |
| robloxdav72@gmail.com | +380934926771 |
| bodnaryuk.halyna@gmail.com | +380635158755 |
| aleksandrbodnariuk8@gmail.com | 0687068007 |
| aleksandrbodnariuk@gmail.com | +380507068007 |

---

### Зміни для виконання

| Тип | Опис |
|-----|------|
| SQL UPDATE | Скопіювати телефони з auth.users metadata в public.users |
| SQL FUNCTION | Оновити `handle_new_user()` - брати телефон з metadata |
| SQL FUNCTION | Оновити `get_users_for_admin()` - fallback на metadata |

---

### Гарантія на майбутнє

1. При реєстрації телефон автоматично копіюється з metadata в `phone_number`
2. Якщо `phone_number` порожній - функція адмін-панелі бере з metadata як резерв
3. Валідація не показує email як телефон

