

## План: Виправлення завантаження сайту

---

### Причина проблеми

У новому `ThemeContext.tsx` є кілька проблем:

1. **Race condition**: `onAuthStateChange` може спрацювати до того, як `loadUserTheme()` завершиться
2. **Можлива нескінченна затримка**: якщо запит до Supabase зависає - сайт не завантажиться
3. **Блокування неавторизованих користувачів**: спінер показується навіть гостям

---

### Рішення

Змінити логіку ThemeContext щоб:
1. Додати timeout для завантаження теми (3 секунди максимум)
2. Показувати дітей одразу, а не чекати на тему
3. Завантажувати тему асинхронно після рендеру

---

### Зміни в ThemeContext.tsx

```tsx
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [defaultTheme, setDefaultTheme] = useState<string>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        // Додаємо timeout 3 секунди
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        const fetchTheme = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from('users')
              .select('theme')
              .eq('id', user.id)
              .single();
            return data?.theme || 'light';
          }
          return 'light';
        };
        
        const theme = await Promise.race([
          fetchTheme(), 
          timeoutPromise
        ]) as string | null;
        
        if (theme) setDefaultTheme(theme);
      } catch (error) {
        console.error('Error loading theme:', error);
        // Використовуємо світлу тему за замовчуванням
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserTheme();
    // ... решта коду
  }, []);

  // Замість спінера - одразу рендеримо з дефолтною темою
  if (isLoading) {
    return (
      <NextThemesProvider 
        attribute="class" 
        defaultTheme="light"
        enableSystem={false}
        storageKey="theme"
      >
        {children}
      </NextThemesProvider>
    );
  }
  // ...
}
```

---

### Альтернативне простіше рішення

Видалити стан `isLoading` повністю і рендерити дітей одразу:

```tsx
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Завантажити тему і застосувати через next-themes
  }, []);

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light"
      enableSystem={false}
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}
```

Тема застосується як тільки завантажиться, без блокування UI.

---

### Очікуваний результат

- Сайт завантажується миттєво
- Тема застосовується асинхронно (можливий короткий flash)
- Немає нескінченного спінера
