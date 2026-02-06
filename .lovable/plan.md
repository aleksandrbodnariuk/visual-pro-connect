

## План: Виправлення адмін-панелі для мобільних пристроїв

---

### Виявлені проблеми

На скриншотах видно три основні проблеми:

1. **Тексти накладаються один на одного** - заголовки і табуляції налазять на контент
2. **Таблиця UsersTab не адаптована** - використовує `grid grid-cols-9`, що не працює на мобільних
3. **Змішання російських та українських слів** - в Admin.tsx є російськомовні тексти

---

### Проблемні файли з російськими словами

| Файл | Рядок | Російська версія | Українська версія |
|------|-------|------------------|-------------------|
| `Admin.tsx` | 67 | "Доступ запрещен: Необходимо войти в систему" | "Доступ заборонено: Необхідно увійти в систему" |
| `Admin.tsx` | 77 | "Доступ запрещен: Необходимы права администратора" | "Доступ заборонено: Необхідні права адміністратора" |
| `Admin.tsx` | 128 | "Загрузка..." | "Завантаження..." |
| `Admin.tsx` | 137 | "Перенаправление на страницу авторизации..." | "Перенаправлення на сторінку авторизації..." |
| `Admin.tsx` | 141 | "Доступ запрещен" | "Доступ заборонено" |
| `Admin.tsx` | 150 | "Панель администратора" | "Панель адміністратора" |
| `Admin.tsx` | 151 | "Управление сайтом" | "Управління сайтом" |
| `Admin.tsx` | 155 | "Администратор-основатель" | "Адміністратор-засновник" |

---

### Структура таблиці UsersTab на мобільних

```text
ПРОБЛЕМА (9 колонок в grid):
┌──────────────────────────────────────────────────────────────┐
│ ID│Email│Ім'я│Тел│Роль│Титул│Акціон│Фахів│Дії              │
├──────────────────────────────────────────────────────────────┤
│ z.│Другий│+38│Модера│Учасни│      │Toggle│Toggle│Видал     │
│ ВСЕ НАКЛАДАЄТЬСЯ                                             │
└──────────────────────────────────────────────────────────────┘

РІШЕННЯ (картки на мобільних):
┌─────────────────────────────────────┐
│ Другий Модератор                    │
│ +380...                             │
│ Роль: Учасник | Титул: -            │
│ [Акціонер: ◯] [Фахівець: ◯]         │
│ [Видалити]                          │
└─────────────────────────────────────┘
```

---

### Детальні технічні зміни

#### 1. Admin.tsx - Переклад на українську

**Рядки 67, 77, 128, 137, 141, 150-155:**

```tsx
// До:
toast.error("Доступ запрещен: Необходимо войти в систему");
// Після:
toast.error("Доступ заборонено: Необхідно увійти в систему");

// До:
toast.error("Доступ запрещен: Необходимы права администратора");
// Після:
toast.error("Доступ заборонено: Необхідні права адміністратора");

// До:
return <div className="container py-16 text-center">Загрузка...</div>;
// Після:
return <div className="container py-16 text-center">Завантаження...</div>;

// До:
return <div className="container py-16 text-center">Перенаправление на страницу авторизации...</div>;
// Після:
return <div className="container py-16 text-center">Перенаправлення на сторінку авторизації...</div>;

// До:
return <div className="container py-16 text-center">Доступ запрещен</div>;
// Після:
return <div className="container py-16 text-center">Доступ заборонено</div>;

// До:
<h1 className="text-3xl font-bold">Панель администратора</h1>
<p className="text-muted-foreground">Управление сайтом Спільнота B&C</p>
<Badge variant="secondary" className="mt-2">Администратор-основатель</Badge>
// Після:
<h1 className="text-3xl font-bold">Панель адміністратора</h1>
<p className="text-muted-foreground">Управління сайтом Спільнота B&C</p>
<Badge variant="secondary" className="mt-2">Адміністратор-засновник</Badge>
```

**Додати відступ для Navbar (рядок 145):**

```tsx
// До:
<div className="min-h-screen">

// Після:
<div className="min-h-screen pt-14 sm:pt-16 3xl:pt-20 pb-safe-nav">
```

---

#### 2. UsersTab.tsx - Адаптивний дизайн для мобільних

**Замінити grid-таблицю на адаптивний layout (рядки 459-507):**

На десктопі залишаємо таблицю, на мобільних використовуємо картки:

```tsx
{/* Desktop Table - hidden on mobile */}
<div className="hidden md:block">
  <div className="grid grid-cols-9 gap-4 font-medium text-sm...">
    {/* Заголовки таблиці */}
  </div>
  {filteredUsers.map((user) => (
    <div key={user.id} className="grid grid-cols-9 gap-4...">
      {/* Рядки таблиці */}
    </div>
  ))}
</div>

{/* Mobile Cards - shown only on mobile */}
<div className="md:hidden space-y-4">
  {filteredUsers.map((user) => (
    <Card key={user.id} className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{user.full_name || 'Не вказано'}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">{user.phone_number}</p>
          </div>
          <UserActions user={user} onDeleteUser={deleteUser} />
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Роль:</span>
            <UserRole user={user} onRoleChange={changeUserRole} />
          </div>
          <div>
            <span className="text-muted-foreground">Титул:</span>
            <UserTitle user={user} onTitleChange={changeUserTitle} />
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Акціонер:</span>
            <ShareholderToggle user={user} onToggleShareholder={toggleShareholderStatus} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Фахівець:</span>
            <SpecialistToggle user={{ ...user, is_specialist: isSpecialist(user.id) }} 
              onToggleSpecialist={toggleSpecialistStatus} />
          </div>
        </div>
      </div>
    </Card>
  ))}
</div>
```

---

#### 3. AdminTabs.tsx - Адаптивні таби

**Зробити таби прокручуваними на мобільних (рядок 36):**

```tsx
// До:
<TabsList className="mb-4 flex flex-wrap gap-1">

// Після:
<TabsList className="mb-4 flex overflow-x-auto gap-1 w-full justify-start pb-2">
```

---

#### 4. ShareholdersTab.tsx - Адаптивна таблиця

**Обгорнути таблицю для горизонтального скролу та додати мобільні картки:**

```tsx
{/* Desktop Table */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">...</table>
</div>

{/* Mobile Cards */}
<div className="md:hidden space-y-4">
  {shareholders.map((shareholder) => (
    <Card key={shareholder.id} className="p-4">
      <div className="space-y-2">
        <h3 className="font-semibold">{shareholder.firstName} {shareholder.lastName}</h3>
        <div className="flex justify-between">
          <span>Титул:</span>
          <Select ...>{/* титул селектор */}</Select>
        </div>
        <div className="flex justify-between">
          <span>Акції:</span>
          <Input type="number" className="w-20" ... />
        </div>
        <div className="flex justify-between">
          <span>Частка:</span>
          <span>{shareholder.percentage}%</span>
        </div>
      </div>
    </Card>
  ))}
</div>
```

---

#### 5. Інші таби з таблицями

Аналогічні зміни для:
- `OrdersTab.tsx` - таблиця замовлень
- `ArchivedOrdersTab.tsx` - таблиця архівних замовлень  
- `StockExchangeTab.tsx` - таблиця угод
- `PostsTab.tsx` - таблиця публікацій

Для кожної таблиці:
1. Додати `hidden md:block` для десктопної версії
2. Додати `md:hidden` для мобільних карток

---

### Підсумок файлів для редагування

| Файл | Тип змін |
|------|----------|
| `src/pages/Admin.tsx` | Переклад на українську + відступ для navbar |
| `src/components/admin/AdminTabs.tsx` | Прокручувані таби |
| `src/components/admin/tabs/UsersTab.tsx` | Мобільні картки замість grid-таблиці |
| `src/components/admin/tabs/ShareholdersTab.tsx` | Мобільні картки |
| `src/components/admin/tabs/OrdersTab.tsx` | Мобільні картки |
| `src/components/admin/tabs/ArchivedOrdersTab.tsx` | Мобільні картки |
| `src/components/admin/tabs/StockExchangeTab.tsx` | Мобільні картки |
| `src/components/admin/tabs/PostsTab.tsx` | Мобільні картки |

---

### Результат

1. Всі російськомовні тексти в адмін-панелі замінені на українські
2. Таблиці на мобільних відображаються як зручні картки
3. Табуляція адмін-панелі прокручується горизонтально на вузьких екранах
4. Відступ зверху для фіксованого navbar запобігає накладанню контенту

