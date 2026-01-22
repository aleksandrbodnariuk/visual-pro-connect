

## План: Активація іконок Фото/Відео/Подія у стрічці новин (як у Facebook)

---

### Проблема

Кнопки "Фото", "Відео", "Подія" у формі створення публікації є статичними та не працюють - при натисканні нічого не відбувається.

---

### Рішення: Редизайн форми створення публікації

Змінити структуру форми на стиль Facebook - компактний дизайн з іконками праворуч від поля вводу та функціональними кнопками.

---

### Візуальна схема

```text
БУЛО (великий блок):
┌────────────────────────────────────────────┐
│ ┌────────────────────────────────────────┐ │
│ │ Що у вас нового?                       │ │
│ │                                        │ │
│ └────────────────────────────────────────┘ │
│ ─────────────────────────────────────────  │
│ 📷 Фото  🎬 Відео  👥 Подія  [Опублікувати]│
└────────────────────────────────────────────┘

СТАНЕ (компактний стиль Facebook):
┌────────────────────────────────────────────┐
│ 👤 [Що у вас нового?___________] 🎬 📷 👥  │
│                                            │
│ (При виборі файлу - превʼю знизу)          │
│ ┌────────────────────────────────────────┐ │
│ │ [Превʼю фото/відео]               ❌   │ │
│ └────────────────────────────────────────┘ │
│                              [Опублікувати]│
└────────────────────────────────────────────┘
```

---

### Файл для редагування

**`src/components/feed/NewsFeed.tsx`**

#### Зміни:

1. **Додати стани для роботи з медіа:**
```tsx
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

2. **Додати обробники для вибору файлів:**
```tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
  const file = e.target.files?.[0];
  if (!file) return;
  // Валідація та створення превʼю
  setSelectedFile(file);
  // ...
};
```

3. **Оновити handleCreatePost для завантаження медіа:**
```tsx
// Якщо є файл - завантажити в storage
if (selectedFile) {
  mediaUrl = await uploadToStorage(...);
}
```

4. **Переробити структуру форми на компактний дизайн:**
```tsx
<Card>
  <CardContent className="p-4">
    {/* Верхня частина: поле вводу + іконки праворуч */}
    <div className="flex items-center gap-3">
      {/* Аватар користувача */}
      <Avatar className="h-10 w-10">...</Avatar>
      
      {/* Поле вводу */}
      <Input
        placeholder="Що у вас нового?"
        value={newPostContent}
        onChange={(e) => setNewPostContent(e.target.value)}
        className="flex-1"
      />
      
      {/* Інтерактивні іконки */}
      <input type="file" accept="video/*" ref={videoInputRef} hidden />
      <input type="file" accept="image/*" ref={imageInputRef} hidden />
      
      <Button variant="ghost" size="icon" onClick={() => videoInputRef.current?.click()}>
        <Video className="h-5 w-5 text-red-500" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()}>
        <Image className="h-5 w-5 text-green-500" />
      </Button>
      <Button variant="ghost" size="icon" onClick={openEventModal}>
        <Users className="h-5 w-5 text-blue-500" />
      </Button>
    </div>
    
    {/* Превʼю вибраного файлу (якщо є) */}
    {previewUrl && (
      <div className="mt-3 relative">
        <img/video src={previewUrl} ... />
        <Button onClick={removeFile} className="absolute top-2 right-2">
          <X />
        </Button>
      </div>
    )}
    
    {/* Кнопка публікації (показуємо якщо є контент або файл) */}
    {(newPostContent.trim() || selectedFile) && (
      <div className="mt-3 flex justify-end">
        <Button onClick={handleCreatePost}>
          <Send className="h-4 w-4 mr-2" />
          Опублікувати
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

---

### Функціональність кнопок

| Кнопка | Дія при натисканні |
|--------|-------------------|
| 🎬 Відео | Відкриває вибір відео файлу (accept="video/*") |
| 📷 Фото | Відкриває вибір зображення (accept="image/*") |
| 👥 Подія | Поки що - показує toast "Функція в розробці" |

---

### Додаткові імпорти

```tsx
import { useRef } from "react";
import { X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { uploadToStorage } from "@/lib/storage";
```

---

### Колір іконок (як у Facebook)

- **Відео**: `text-red-500` (червоний)
- **Фото**: `text-green-500` (зелений)
- **Подія**: `text-blue-500` (синій)

---

### Очікуваний результат

- Компактний дизайн форми, схожий на Facebook
- Іконки Фото та Відео працюють - відкривають вибір файлу
- Превʼю вибраного файлу показується перед публікацією
- Можливість видалити вибраний файл
- Публікація з медіа завантажується в storage та зберігається в базу
- Кнопка "Подія" показує повідомлення про розробку функції

