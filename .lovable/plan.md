

## План: Виправлення перекриття аватара та інформації профілю сайдбаром

---

### Діагностика проблеми

На скриншоті видно:
- Аватар не відображається (схований за sidebar)
- Ім'я обрізане - "р Боднарюк" замість "Олександр Боднарюк"  
- Лічильники публікацій/підписників не видно
- Кнопка "Редагувати профіль" виїхала за праву межу

**Причина**: `ProfileHeader` рендериться на повну ширину екрана, але **fixed Sidebar перекриває ліву частину**.

---

### Порівняння з правильним layout

| Сторінка | ProfileHeader | Sidebar | Результат |
|----------|---------------|---------|-----------|
| `Index.tsx` | Контент всередині grid | Fixed зліва | Не перекриває |
| `Profile.tsx` | Поза grid (на повну ширину) | Fixed зліва | **Перекриває!** |

---

### Рішення

Додати **відступ зліва** для `ProfileHeader` на desktop, щоб sidebar не перекривав:

#### Зміна в ProfileHeader.tsx

```tsx
// Рядок 115: Інформація профілю
<div className="container relative -mt-16 px-4 md:pl-[calc(25%+1.5rem)] lg:pl-[calc(25%+2rem)]">
```

Це додасть лівий padding на desktop, який відповідає ширині sidebar.

---

### Альтернативне рішення (краще)

Перенести `ProfileHeader` всередину grid-layout, як це зроблено в Index.tsx:

#### Зміна в Profile.tsx

```tsx
<div className="container mt-8 grid grid-cols-12 gap-6 px-4 md:px-6">
  {/* Spacer для fixed sidebar */}
  <div className="hidden md:block md:col-span-4 lg:col-span-3" aria-hidden="true" />
  
  {/* ProfileHeader тепер в правильній колонці */}
  <div className="col-span-12 md:col-span-8 lg:col-span-9">
    <ProfileHeader user={user} onEditProfile={handleEditProfile} />
    
    <main className="mt-6">
      <Tabs defaultValue="posts" className="w-full">
        ...
      </Tabs>
    </main>
  </div>
</div>
```

---

### Файли для редагування

| Файл | Зміна |
|------|-------|
| `src/pages/Profile.tsx` | Перенести ProfileHeader всередину grid-layout |
| `src/components/profile/ProfileHeader.tsx` | Видалити container клас, використовувати повну ширину батьківського елемента |

---

### Очікуваний результат

1. Аватар відображається повністю (не перекривається sidebar)
2. Повне ім'я "Олександр Боднарюк" видиме
3. Лічильники публікацій/підписників видимі
4. Кнопка "Редагувати профіль" на своєму місці
5. Layout профілю відповідає layout іншим сторінкам

