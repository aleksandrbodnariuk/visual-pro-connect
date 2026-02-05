
## План: Система персональних тем (світла/темна)

---

### Аналіз поточного стану

| Компонент | Статус |
|-----------|--------|
| `next-themes` бібліотека | ✅ Встановлена |
| CSS змінні `.dark` | ✅ Визначені в `index.css` |
| Tailwind `darkMode: ["class"]` | ✅ Налаштовано |
| ThemeProvider | ❌ Відсутній |
| Збереження теми користувача | ❌ Відсутнє |

---

### Архітектура рішення

```text
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              ThemeProvider                       │   │
│  │  (next-themes + синхронізація з Supabase)       │   │
│  │                                                  │   │
│  │  ┌─────────────┐    ┌──────────────────────┐    │   │
│  │  │ useTheme()  │ ─► │ Supabase users.theme │    │   │
│  │  └─────────────┘    └──────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

### Частина 1: Додати колонку `theme` в таблицю `users`

SQL міграція для збереження теми користувача:

```sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';
```

---

### Частина 2: Створити ThemeProvider

**Файл: `src/context/ThemeContext.tsx`**

```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [defaultTheme, setDefaultTheme] = useState<string>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Завантажити тему користувача з Supabase
    const loadUserTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('theme')
          .eq('id', user.id)
          .single();
        
        if (data?.theme) {
          setDefaultTheme(data.theme);
        }
      }
      setIsLoading(false);
    };
    
    loadUserTheme();
  }, []);

  if (isLoading) return null;

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme={defaultTheme}
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}
```

---

### Частина 3: Інтегрувати в App.tsx

```tsx
import { ThemeProvider } from './context/ThemeContext';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        {/* ... решта коду */}
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
```

---

### Частина 4: Компонент перемикача теми

**Файл: `src/components/settings/ThemeSettings.tsx`**

```tsx
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    
    // Зберегти в Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('users')
        .update({ theme: newTheme })
        .eq('id', user.id);
      
      toast.success('Тему змінено');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Тема оформлення</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => handleThemeChange('light')}
          >
            <Sun className="mr-2 h-4 w-4" />
            Світла
            {theme === 'light' && <Check className="ml-2 h-4 w-4" />}
          </Button>
          
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => handleThemeChange('dark')}
          >
            <Moon className="mr-2 h-4 w-4" />
            Темна
            {theme === 'dark' && <Check className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Частина 5: Додати в Settings.tsx

Додати новий таб "Зовнішній вигляд" або в "Загальні":

```tsx
import { ThemeSettings } from '@/components/settings/ThemeSettings';

// В TabsList:
<TabsTrigger value="appearance">Зовнішній вигляд</TabsTrigger>

// Новий TabsContent:
<TabsContent value="appearance">
  <ThemeSettings />
</TabsContent>
```

---

### Частина 6: Перевірка контрасту всіх компонентів

Компоненти що потребують перевірки:

| Компонент | Файл | Що перевірити |
|-----------|------|---------------|
| Navbar | Navbar.tsx | bg-background, text-foreground |
| Sidebar | Sidebar.tsx | bg-card, border |
| Cards | Всі сторінки | Читабельність тексту |
| Buttons | UI компоненти | Контраст в обох темах |
| Inputs | Forms | Колір placeholder, border |
| Dialogs | Modal windows | Фон і текст |

CSS змінні вже правильно визначені для обох тем в `index.css`, тому основні компоненти мають працювати коректно.

---

### Файли для створення/редагування

| Файл | Дія |
|------|-----|
| SQL міграція | Додати колонку `theme` |
| `src/context/ThemeContext.tsx` | Створити новий |
| `src/components/settings/ThemeSettings.tsx` | Створити новий |
| `src/App.tsx` | Обгорнути в ThemeProvider |
| `src/pages/Settings.tsx` | Додати таб для теми |

---

### Очікуваний результат

1. Користувач бачить перемикач теми в налаштуваннях
2. При виборі теми - інтерфейс миттєво змінюється
3. Тема зберігається в базі даних для конкретного користувача
4. При наступному вході - тема автоматично застосовується
5. Всі елементи інтерфейсу коректно відображаються в обох темах
