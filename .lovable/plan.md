
## План: Виправлення автентифікації та логотипу

---

### Діагностика проблем

| Проблема | Причина | Файл |
|----------|---------|------|
| Логотип не відображається | Запит до `site_settings` зависає або RLS блокує доступ | `NavbarLogo.tsx` |
| Циклічний редирект | `isAuthenticated` в `useEffect` deps створює нескінченний цикл | `Auth.tsx` |
| Вхід не зберігається | Кожен компонент має власний екземпляр `useSupabaseAuth` з локальним станом | `useSupabaseAuth.ts`, `Index.tsx` |

---

### Архітектурна проблема

```text
Поточний стан:
┌─────────────────────────────────────────────────────────┐
│  Auth.tsx                                               │
│  └─ useSupabaseAuth() ─► [session: null → logged_in]   │
└─────────────────────────────────────────────────────────┘
                           ↓ navigate("/")
┌─────────────────────────────────────────────────────────┐
│  Index.tsx                                              │
│  └─ useAuthState() → useSupabaseAuth()                  │
│     └─► [session: null] ← НОВИЙ ЕКЗЕМПЛЯР!             │
│         currentUser = null → показує Hero               │
└─────────────────────────────────────────────────────────┘

Кожен компонент створює свій useState для session!
```

---

### Рішення

#### Частина 1: Створити AuthContext для глобального стану

**Новий файл: `src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Спочатку налаштовуємо listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Потім отримуємо початкову сесію
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAuthenticated: !!session?.user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

#### Частина 2: Обгорнути App в AuthProvider

**Файл: `src/App.tsx`**

```tsx
import { AuthProvider } from './context/AuthContext';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        {/* ... решта */}
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

---

#### Частина 3: Оновити Auth.tsx

```tsx
import { useAuth } from '@/context/AuthContext';

export default function Auth() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    // Чекаємо завантаження перед редиректом
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);
  
  // Показуємо loader поки визначається стан
  if (loading) {
    return <div>Завантаження...</div>;
  }
  
  // ... решта коду
}
```

---

#### Частина 4: Оновити Index.tsx

```tsx
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Завантаження...</div>;
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted/30 pt-14 sm:pt-16 3xl:pt-20">
        <Navbar />
        <Hero />
      </div>
    );
  }
  
  // ... авторизований контент
};
```

---

#### Частина 5: Виправити NavbarLogo

Додати fallback та timeout для завантаження логотипу:

```tsx
useEffect(() => {
  const loadLogoAndSiteName = async () => {
    try {
      setIsLoading(true);
      
      // Timeout 3 секунди
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const fetchSettings = async () => {
        // ... існуючий код
      };
      
      await Promise.race([fetchSettings(), timeout]);
    } catch (error) {
      // Fallback до дефолтних значень
      setLogoUrl('/default-logo.png');
      setSiteName('Спільнота B&C');
    } finally {
      setIsLoading(false);
    }
  };
  
  loadLogoAndSiteName();
}, []);
```

---

### Файли для редагування

| Файл | Дія |
|------|-----|
| `src/context/AuthContext.tsx` | Створити новий |
| `src/App.tsx` | Додати AuthProvider |
| `src/pages/Auth.tsx` | Використати useAuth з контексту |
| `src/pages/Index.tsx` | Використати useAuth замість useAuthState |
| `src/components/layout/NavbarLogo.tsx` | Додати timeout і fallback |

---

### Очікуваний результат

1. Логотип завантажується коректно з fallback на дефолтний
2. Після входу користувач потрапляє на головну сторінку
3. Стан автентифікації синхронізується між усіма компонентами
4. Немає циклічних редиректів
