

## План: Фільтрація друзів та заміна кнопки "Написати"

---

### Проблема

1. На сторінці "Знайти друзів" показуються всі користувачі, включаючи тих, хто вже є друзями
2. Є дві окремі кнопки "Написати" та "Додати" - замість цього потрібна одна кнопка "Додати в друзі"

---

### Поточний стан

```text
ЗАРАЗ:
┌─────────────────────────────────────────┐
│  Картка користувача                     │
│  ┌─────────┐                            │
│  │ Avatar  │  Ім'я користувача          │
│  └─────────┘  Категорія                 │
│                                         │
│  [Профіль] [Написати] [Додати] ← 3 кнопки│
└─────────────────────────────────────────┘

ПІСЛЯ:
┌─────────────────────────────────────────┐
│  Картка користувача                     │
│  ┌─────────┐                            │
│  │ Avatar  │  Ім'я користувача          │
│  └─────────┘  Категорія                 │
│                                         │
│  [Профіль] [Додати в друзі] ← 2 кнопки  │
└─────────────────────────────────────────┘

+ Показуються тільки НЕ-друзі
```

---

### Технічні зміни

#### Файл: `src/pages/Connect.tsx`

**1. Імпорт хука checkFriendshipStatus (рядок 26)**

```tsx
// До:
const { sendFriendRequest, friends } = useFriendRequests();

// Після:
const { sendFriendRequest, friends, friendRequests, checkFriendshipStatus } = useFriendRequests();
```

**2. Оновити фільтрацію (рядки 75-103)**

Додати фільтр для виключення друзів та тих, кому вже відправлено запит:

```tsx
useEffect(() => {
  let result = users;
  
  // Не показуємо поточного користувача
  if (currentUserId) {
    result = result.filter(user => user.id !== currentUserId);
  }
  
  // Не показуємо друзів та тих, кому вже відправлено запит
  result = result.filter(user => {
    const status = checkFriendshipStatus(user.id);
    // Показуємо тільки тих, з ким немає зв'язку
    return status.status === 'none';
  });
  
  // Застосувати фільтр пошуку
  if (searchTerm) {
    // ... існуюча логіка
  }
  
  // Застосувати фільтр категорії
  if (categoryFilter !== "all") {
    // ... існуюча логіка
  }
  
  setFilteredUsers(result);
}, [searchTerm, categoryFilter, users, currentUserId, friendRequests, checkFriendshipStatus]);
```

**3. Оновити кнопки в картці (рядки 213-232)**

Видалити кнопку "Написати", залишити тільки "Профіль" та "Додати в друзі":

```tsx
// До:
<div className="flex mt-4 space-x-2 justify-center">
  <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${user.id}`)}>
    <User className="h-4 w-4 mr-1" /> Профіль
  </Button>
  <Button 
    variant="outline" 
    size="sm" 
    onClick={() => handleSendMessage(user.id)}
  >
    <MessageSquare className="h-4 w-4 mr-1" /> Написати
  </Button>
  {!isFriend(user.id) && (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => handleSendFriendRequest(user.id)}
    >
      <UserPlus className="h-4 w-4 mr-1" /> Додати
    </Button>
  )}
</div>

// Після:
<div className="flex mt-4 space-x-2 justify-center">
  <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${user.id}`)}>
    <User className="h-4 w-4 mr-1" /> Профіль
  </Button>
  <Button 
    size="sm"
    onClick={() => handleSendFriendRequest(user.id)}
  >
    <UserPlus className="h-4 w-4 mr-1" /> Додати в друзі
  </Button>
</div>
```

**4. Видалити невикористані імпорти**

```tsx
// До:
import { Search, Filter, Users, User, UserPlus, MessageSquare } from "lucide-react";

// Після:
import { Search, Filter, Users, User, UserPlus } from "lucide-react";
```

**5. Видалити невикористану функцію handleSendMessage (рядки 114-116)**

---

### Логіка фільтрації

| Статус дружби | Показувати в списку? |
|---------------|---------------------|
| `none` | Так - можна додати в друзі |
| `pending-sent` | Ні - вже відправлено запит |
| `pending-received` | Ні - очікує відповіді |
| `friends` | Ні - вже друзі |

---

### Результат

1. На сторінці "Знайти друзів" показуються тільки користувачі, яких ще немає в друзях
2. Кнопка "Написати" видалена
3. Кнопка "Додати в друзі" - основна дія для кожної картки
4. Після додавання в друзі, користувач автоматично зникне зі списку (завдяки real-time підписці)

