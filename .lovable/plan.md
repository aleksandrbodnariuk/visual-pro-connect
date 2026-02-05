

## План: Виправлення критичних проблем завантаження сайту

---

### Діагностика

Після аналізу коду виявлено **кореневу причину** проблем:

| Проблема | Файл | Опис |
|----------|------|------|
| Блокуючий `initializeStorage()` | `main.tsx:36` | Запускається синхронно при старті, робить 5 запитів до Storage |
| Дублювання `onAuthStateChange` | `ThemeContext.tsx`, `AuthContext.tsx` | Дві підписки конкурують за один потік подій |
| Відсутній timeout в ThemeSyncer | `ThemeContext.tsx:14-31` | Запит до `users` може зависати нескінченно |
| Запити без error handling | `ThemeContext.tsx` | Помилка RLS блокує весь ThemeProvider |

---

### Послідовність проблем при завантаженні

```text
Старт додатку
    ↓
main.tsx: initializeStorage() ─→ 5 паралельних запитів до Storage
    ↓ (блокує потік)
App.tsx рендериться
    ↓
AuthProvider: onAuthStateChange + getSession ─→ 2 запити
    ↓
ThemeProvider: ThemeSyncer ─→ getUser + select users + onAuthStateChange
    ↓                          ↑
    └──────────────────────────┘
         Конкуренція за auth state
    ↓
NavbarLogo: запит site_settings (timeout 15 сек)
    ↓
NewsFeed: запит posts + RPC (timeout 15 сек)
    ↓
ВСІ ЗАПИТИ ЧЕКАЮТЬ ОДИН ОДНОГО = TIMEOUT
```

---

### Рішення

#### Частина 1: Видалити блокуючий `initializeStorage()` з main.tsx

Перенести ініціалізацію сховища в useEffect або видалити повністю (бакети вже існують):

```tsx
// main.tsx - ВИДАЛИТИ рядки 11-36
// initializeStorage() не потрібен - бакети вже створені
```

---

#### Частина 2: Спростити ThemeContext - видалити дублювання

Змінити ThemeSyncer щоб не підписувався на `onAuthStateChange` (це вже робить AuthProvider):

```tsx
function ThemeSyncer() {
  const { setTheme } = useTheme();
  const { user, loading } = useAuth(); // Використовуємо готовий стан з AuthContext!

  useEffect(() => {
    // Завантажуємо тему тільки коли user вже визначений
    if (loading || !user) return;
    
    const loadTheme = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('theme')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data?.theme) {
          setTheme(data.theme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    
    loadTheme();
  }, [user, loading, setTheme]);

  return null;
}
```

---

#### Частина 3: Змінити порядок провайдерів в App.tsx

AuthProvider має бути першим, щоб ThemeSyncer міг використовувати useAuth():

```tsx
// Поточний порядок - ПРАВИЛЬНИЙ
<QueryClientProvider>
  <AuthProvider>      // ← Спочатку Auth
    <ThemeProvider>   // ← Потім Theme (використовує useAuth)
```

---

#### Частина 4: Видалити застарілий код з main.tsx

```tsx
// main.tsx - спрощений
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### Файли для редагування

| Файл | Дія |
|------|-----|
| `src/main.tsx` | Видалити `initializeStorage()` та зайві імпорти |
| `src/context/ThemeContext.tsx` | Використовувати `useAuth()` замість власної підписки |

---

### Очікуваний результат

1. Сайт завантажується без зависання
2. Головна сторінка показує контент
3. Сторінка входу (`/auth`) відкривається
4. Немає конкуренції за auth state між провайдерами
5. Тема завантажується після того як користувач авторизований

