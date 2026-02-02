
## План: Виправлення визначення власного профілю, лічильників та портфоліо

---

### Виявлені проблеми

1. **`isCurrentUser` визначається неправильно** - використовується `localStorage.currentUser.id` замість `supabase.auth.getUser()`
2. **Лічильники публікацій/підписників/підписок завжди 0** - значення хардкодяться як 0
3. **Кнопки "Підписатися" та "Додати в друзі" показуються на власному профілі** - через неправильне `isCurrentUser`
4. **Кнопка "Додати в портфоліо" не показується** - через те саме `isCurrentUser === false`

---

### Причина кореневої проблеми

```text
Profile.tsx:
┌────────────────────────────────────────────────────────────────────────────┐
│ const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')│
│ const isOwnProfile = currentUser.id === targetUserId                       │
│                      ↓                                                     │
│           localStorage.currentUser.id !== Supabase Auth user.id            │
│                      ↓                                                     │
│                 isCurrentUser = false                                      │
│                      ↓                                                     │
│ ❌ Кнопка "Редагувати профіль" не показується                              │
│ ❌ Кнопка "Додати в портфоліо" не показується                              │
│ ❌ Показуються "Підписатися", "Написати", "Додати в друзі"                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Рішення

---

### Файл 1: `src/pages/Profile.tsx`

#### Зміна 1.1: Використовувати Supabase Auth для визначення поточного користувача

Замінити рядки 75-85 на:

```tsx
try {
  // ВАЖЛИВО: Використовуємо Supabase Auth як єдине джерело правди
  const { data: authData } = await supabase.auth.getUser();
  const authUserId = authData?.user?.id || null;
  
  // Fallback на localStorage тільки якщо Supabase Auth недоступний
  const localUser = localStorage.getItem('currentUser') 
    ? JSON.parse(localStorage.getItem('currentUser') || '{}') 
    : null;
  
  const currentUserId = authUserId || localUser?.id || null;
  const targetUserId = userId || currentUserId;
  
  if (!targetUserId) {
    throw new Error('Не вдалося визначити ID користувача');
  }
  
  // Перевірка власного профілю
  const isOwnProfile = currentUserId !== null && currentUserId === targetUserId;
  setIsCurrentUser(isOwnProfile);
  
  console.log('Profile: isCurrentUser check', {
    authUserId,
    localUserId: localUser?.id,
    currentUserId,
    targetUserId,
    isOwnProfile
  });
```

#### Зміна 1.2: Підрахувати реальну кількість публікацій

Після отримання постів (рядок ~167), оновити лічильник:

```tsx
// Оновлюємо кількість публікацій
setUser(prev => ({
  ...prev,
  postsCount: postsData.length
}));
```

Або одразу при створенні об'єкта user:

```tsx
postsCount: postsData.length, // Замість 0
```

Але оскільки пости завантажуються після створення user, потрібен окремий useEffect або оновлення стану.

#### Зміна 1.3: Оновити об'єкт user з реальними даними постів

Змінити структуру - спочатку завантажити пости, потім створити user:

```tsx
// Спочатку отримуємо кількість постів
let postsData = [];
let postsCount = 0;

try {
  const { data, count } = await supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('user_id', targetUserId);
  
  if (data) {
    postsData = data;
    postsCount = data.length;
  }
} catch (postsError) {
  console.warn("Помилка отримання постів:", postsError);
}

// Потім створюємо user з правильним postsCount
setUser({
  // ... інші поля
  postsCount: postsCount,
  // ...
});
```

---

### Файл 2: `src/components/profile/ProfileHeader.tsx`

#### Зміна 2.1: Використовувати тільки пропс `isCurrentUser` без додаткових перевірок

Видалити дублювання логіки перевірки `currentUserId`:

Рядки 55-83 (useEffect з checkCurrentUser) - **видалити**, оскільки перевірка вже зроблена в `Profile.tsx` і передається через пропс.

Рядки 221-229 (перевірка `!isCurrentUser && currentUserId`) - спростити:

```tsx
{isCurrentUser ? (
  <Button variant="outline" className="gap-2" onClick={onEditProfile}>
    <Edit className="h-4 w-4" />
    <span>Редагувати профіль</span>
  </Button>
) : (
  <div className="flex gap-2">
    <Button variant="outline" onClick={handleSendMessage}>
      <MessageCircle className="w-4 h-4 mr-2" />
      Написати
    </Button>
    <Button className="bg-gradient-purple">Підписатися</Button>
    <Button variant="secondary" onClick={handleAddFriend} disabled={isSendingRequest}>
      <UserPlus className="w-4 h-4 mr-2" />
      Додати в друзі
    </Button>
  </div>
)}
```

---

### Файл 3: `src/components/profile/PortfolioGrid.tsx`

Тут немає проблем з логікою - `isOwner` передається правильно. Проблема саме в `Profile.tsx`, де `isCurrentUser` неправильно визначається.

---

### Підсумок змін

| Файл | Зміни |
|------|-------|
| `src/pages/Profile.tsx` | Використовувати `supabase.auth.getUser()` як джерело правди для `isCurrentUser`, підрахувати реальну кількість постів |
| `src/components/profile/ProfileHeader.tsx` | Прибрати дублювання логіки перевірки `currentUserId`, покладатися на пропс `isCurrentUser` |

---

### Очікуваний результат

1. **На власному профілі** буде показуватися:
   - Кнопка "Редагувати профіль"
   - Кнопка "Створити публікацію"
   - Кнопка "Додати в портфоліо"
   - НЕ буде кнопок "Написати", "Підписатися", "Додати в друзі"

2. **Лічильник публікацій** буде показувати реальну кількість постів

3. **На чужому профілі** будуть показуватися кнопки взаємодії

---

### Візуальна схема виправлення

```text
БУЛО:
┌────────────────────────────────────────────────────────────────────────────┐
│ localStorage.currentUser.id = "abc123" (застаріле)                         │
│ Supabase Auth user.id = "c836df06-8923-468e-b4c1-9331cadbe183"             │
│ targetUserId = "c836df06-8923-468e-b4c1-9331cadbe183"                      │
│                                                                            │
│ isOwnProfile = "abc123" === "c836df06..." → FALSE ❌                       │
└────────────────────────────────────────────────────────────────────────────┘

СТАНЕ:
┌────────────────────────────────────────────────────────────────────────────┐
│ supabase.auth.getUser() → id = "c836df06-8923-468e-b4c1-9331cadbe183"     │
│ targetUserId = "c836df06-8923-468e-b4c1-9331cadbe183"                      │
│                                                                            │
│ isOwnProfile = "c836df06..." === "c836df06..." → TRUE ✅                   │
└────────────────────────────────────────────────────────────────────────────┘
```
