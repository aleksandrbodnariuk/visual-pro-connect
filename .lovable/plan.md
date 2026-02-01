

## План: Активація іконок Фото/Відео/Подія у стрічці новин (як у Facebook)

---

### Поточна проблема

Кнопки "Фото", "Відео", "Подія" (рядки 170-181 в `NewsFeed.tsx`) є статичними:
- Немає `onClick` обробників
- Немає стану для вибраних файлів
- Немає функціоналу завантаження медіа

---

### Рішення: Редизайн форми на компактний стиль Facebook

```text
ПОТОЧНИЙ (великий блок):
┌────────────────────────────────────────────┐
│ ┌────────────────────────────────────────┐ │
│ │ Що у вас нового?                       │ │
│ │                                        │ │
│ └────────────────────────────────────────┘ │
│ ─────────────────────────────────────────  │
│ 📷 Фото  🎬 Відео  👥 Подія  [Опублікувати]│
└────────────────────────────────────────────┘

НОВИЙ (як у Facebook):
┌────────────────────────────────────────────┐
│ 👤 [Що у вас нового?___________] 🎬 📷 👥  │
│                                            │
│ (При виборі файлу - превʼю)                │
│ ┌────────────────────────────────────────┐ │
│ │ [Превʼю фото/відео]               ❌   │ │
│ └────────────────────────────────────────┘ │
│                              [Опублікувати]│
└────────────────────────────────────────────┘
```

---

### Файл для редагування

**`src/components/feed/NewsFeed.tsx`**

---

### Зміна 1: Додати нові імпорти та стани

```tsx
// Додаткові імпорти
import { useRef } from "react";
import { X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { uploadToStorage } from "@/lib/storage";

// Нові стани
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
const [isUploading, setIsUploading] = useState(false);
const imageInputRef = useRef<HTMLInputElement>(null);
const videoInputRef = useRef<HTMLInputElement>(null);
```

---

### Зміна 2: Додати обробники для файлів

```tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Валідація типу файлу
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    toast({ title: 'Підтримуються лише зображення та відео', variant: 'destructive' });
    return;
  }

  // Валідація розміру (макс 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    toast({ title: 'Розмір файлу не повинен перевищувати 50MB', variant: 'destructive' });
    return;
  }

  setSelectedFile(file);
  
  // Створення превʼю
  const reader = new FileReader();
  reader.onload = (event) => {
    setPreviewUrl(event.target?.result as string);
  };
  reader.readAsDataURL(file);
};

const removeFile = () => {
  setSelectedFile(null);
  setPreviewUrl(null);
  if (imageInputRef.current) imageInputRef.current.value = '';
  if (videoInputRef.current) videoInputRef.current.value = '';
};

const handleEventClick = () => {
  toast({ title: "Функція 'Подія' в розробці" });
};
```

---

### Зміна 3: Оновити handleCreatePost для завантаження медіа

```tsx
const handleCreatePost = async () => {
  if (!newPostContent.trim() && !selectedFile) return;

  setIsUploading(true);

  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    
    let mediaUrl = null;

    // Завантаження медіа файлу
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
      const uniqueFileName = `post-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      const filePath = `posts/${uniqueFileName}`;
      
      mediaUrl = await uploadToStorage('posts', filePath, selectedFile, selectedFile.type);
    }
    
    const newPost = {
      content: newPostContent,
      user_id: currentUser.id,
      media_url: mediaUrl,
      category: activeCategory === 'all' ? null : activeCategory
    };

    const { data, error } = await supabase
      .from('posts')
      .insert([newPost])
      .select()
      .single();

    if (error) throw error;

    setPosts([data, ...posts]);
    setNewPostContent("");
    setSelectedFile(null);
    setPreviewUrl(null);
    toast({ title: "Публікацію створено!" });

  } catch (error) {
    console.error("Помилка:", error);
    toast({ title: "Помилка створення публікації", variant: "destructive" });
  } finally {
    setIsUploading(false);
  }
};
```

---

### Зміна 4: Новий дизайн форми створення публікації

```tsx
<Card>
  <CardContent className="p-3 md:p-4">
    {/* Приховані input для вибору файлів */}
    <input
      ref={imageInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileSelect}
      className="hidden"
    />
    <input
      ref={videoInputRef}
      type="file"
      accept="video/*"
      onChange={handleFileSelect}
      className="hidden"
    />

    {/* Компактний рядок: аватар + поле вводу + іконки */}
    <div className="flex items-center gap-2 md:gap-3">
      <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0">
        <AvatarImage src={currentUser?.avatar_url} />
        <AvatarFallback>{currentUser?.full_name?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      
      <Input
        placeholder="Що у вас нового?"
        value={newPostContent}
        onChange={(e) => setNewPostContent(e.target.value)}
        className="flex-1 h-10 bg-muted/50 border-0"
      />
      
      {/* Кольорові іконки як у Facebook */}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => videoInputRef.current?.click()}
        className="shrink-0"
      >
        <Video className="h-5 w-5 text-red-500" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => imageInputRef.current?.click()}
        className="shrink-0"
      >
        <Image className="h-5 w-5 text-green-500" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={handleEventClick}
        className="shrink-0"
      >
        <Users className="h-5 w-5 text-blue-500" />
      </Button>
    </div>

    {/* Превʼю вибраного файлу */}
    {previewUrl && selectedFile && (
      <div className="mt-3 relative rounded-lg overflow-hidden border">
        {selectedFile.type.startsWith('image/') ? (
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full max-h-64 object-cover"
          />
        ) : (
          <video 
            src={previewUrl} 
            className="w-full max-h-64 object-cover"
            controls
          />
        )}
        <Button
          variant="destructive"
          size="icon"
          onClick={removeFile}
          className="absolute top-2 right-2 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )}

    {/* Кнопка публікації - показуємо якщо є контент або файл */}
    {(newPostContent.trim() || selectedFile) && (
      <div className="mt-3 flex justify-end">
        <Button 
          onClick={handleCreatePost}
          disabled={isUploading}
          className="bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          {isUploading ? "Завантаження..." : "Опублікувати"}
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

---

### Колірна схема іконок (як у Facebook)

| Іконка | Колір | Дія |
|--------|-------|-----|
| 🎬 Відео | `text-red-500` | Відкриває вибір відео |
| 📷 Фото | `text-green-500` | Відкриває вибір зображення |
| 👥 Подія | `text-blue-500` | Toast "В розробці" |

---

### Очікуваний результат

- Компактний дизайн форми в один рядок (як Facebook)
- Іконки Фото та Відео працюють - відкривають вибір файлу
- Превʼю вибраного файлу відображається перед публікацією
- Можливість видалити вибраний файл
- Медіа завантажується в Supabase Storage
- Кнопка "Опублікувати" зʼявляється тільки коли є контент

