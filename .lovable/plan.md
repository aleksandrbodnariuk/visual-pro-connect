

## План: Виправлення аватара в редакторі профілю

---

### Виявлені проблеми

1. **Аватар не відображається** у вкладці "Профіль" редактора, бо:
   - `avatarUrl` не передається або передається `null`
   - Об'єкт `user` в Profile.tsx створюється з `avatarUrl`, але воно не завжди синхронізовано з `avatar_url` з БД

2. **Слайдер розміру не працює** в діалозі зміни аватара:
   - Стан `avatarSize` змінюється, але аватар в діалозі має фіксований клас `h-32 w-32`
   - `scale` трансформація не застосовується до аватара в діалозі

3. **Неузгодженість полів**:
   - БД використовує `avatar_url` (snake_case)
   - Код використовує і `avatarUrl`, і `avatar_url` - створює плутанину

---

### Файл 1: `src/components/profile/ProfileEditorDialog.tsx`

**Проблема:** Передається `user.avatarUrl`, але поле може бути `user.avatar_url`

**Зміни:**

Рядок 84 - використовувати обидва варіанти:
```tsx
<AvatarUpload 
  userId={user.id} 
  avatarUrl={user.avatarUrl || user.avatar_url}
  onAvatarChange={handleAvatarChange} 
/>
```

---

### Файл 2: `src/components/profile/ProfileEditor.tsx`

**Проблема 1:** Аватар не показується на вкладці "Профіль"
**Проблема 2:** Слайдер в діалозі не змінює розмір аватара

**Зміни:**

#### 2.1 Оновити ініціалізацію `avatarUrl` (рядок 40)
```tsx
const [avatarUrl, setAvatarUrl] = useState<string | null>(
  user?.avatar_url || user?.avatarUrl || null
);
```

#### 2.2 Оновити useEffect (рядок 54)
```tsx
setAvatarUrl(user.avatar_url || user.avatarUrl || null);
```

#### 2.3 Застосувати `avatarSize` до аватара в діалозі (рядок 413)

Замінити:
```tsx
<Avatar className="h-32 w-32">
```

На:
```tsx
<Avatar 
  className="h-32 w-32 transition-transform"
  style={{ transform: `scale(${avatarSize / 100})` }}
>
```

#### 2.4 Додати візуальний контейнер для масштабування

Щоб scale працював візуально правильно, обгорнути аватар:
```tsx
<div className="flex justify-center py-4" style={{ minHeight: '160px' }}>
  <Avatar 
    className="h-32 w-32 transition-transform origin-center"
    style={{ transform: `scale(${avatarSize / 100})` }}
  >
    {tempAvatarUrl ? (
      <AvatarImage src={tempAvatarUrl} alt="Новий аватар" />
    ) : (
      <AvatarFallback>
        <UserRound className="h-16 w-16" />
      </AvatarFallback>
    )}
  </Avatar>
</div>
```

---

### Файл 3: `src/components/profile/avatar/AvatarUpload.tsx` (опціонально)

**Покращення:** Додати підтримку зміни розміру

Якщо потрібен слайдер у вкладці "Аватар", додати:
```tsx
interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
  showSizeControl?: boolean;  // Новий пропс
}
```

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `ProfileEditorDialog.tsx` | Використовувати `avatarUrl \|\| avatar_url` |
| `ProfileEditor.tsx` | Ініціалізувати з обох полів, застосувати `avatarSize` до аватара в діалозі |

---

### Очікуваний результат

1. **Аватар видно** в редакторі профілю (вкладка "Профіль" і діалог зміни)
2. **Слайдер працює** - при зміні значення аватар масштабується
3. **Завантажений аватар відображається** в превʼю перед збереженням

