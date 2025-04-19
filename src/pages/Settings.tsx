
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';

export default function Settings() {
  const { language } = useLanguage();
  const t = translations[language];
  
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Поля профілю
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  
  // Соціальні мережі
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [viber, setViber] = useState('');
  
  // Поля для зміни паролю
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Масив категорій для вибору
  const categories = [
    { id: 'photographer', label: 'Фотограф' },
    { id: 'videographer', label: 'Відеограф' },
    { id: 'musician', label: 'Музикант' },
    { id: 'host', label: 'Ведучий' },
    { id: 'pyrotechnician', label: 'Піротехнік' }
  ];
  
  // Стан для зберігання вибраних категорій
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  useEffect(() => {
    // Отримання даних користувача з localStorage
    const userJSON = localStorage.getItem('currentUser');
    if (!userJSON) {
      navigate('/auth');
      return;
    }
    
    const userData = JSON.parse(userJSON);
    setUser(userData);
    
    // Заповнення полів даними користувача
    setFirstName(userData.firstName || '');
    setLastName(userData.lastName || '');
    setPhone(userData.phoneNumber || '');
    setBio(userData.bio || '');
    setLocation(userData.location || '');
    setWebsite(userData.website || '');
    
    // Соціальні мережі
    setInstagram(userData.instagram || '');
    setFacebook(userData.facebook || '');
    setViber(userData.viber || '');
    
    // Встановлення вибраних категорій
    setSelectedCategories(userData.categories || []);
    
    setLoading(false);
  }, [navigate]);
  
  const handleSaveProfile = () => {
    if (!firstName || !lastName) {
      toast.error("Ім'я та прізвище обов'язкові");
      return;
    }
    
    // Оновлюємо дані користувача в localStorage
    const updatedUser = {
      ...user,
      firstName,
      lastName,
      phoneNumber: phone,
      bio,
      location,
      website,
      instagram,
      facebook,
      viber,
      categories: selectedCategories
    };
    
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    
    // Оновлюємо дані користувача в списку всіх користувачів
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) => {
      if (u.id === user.id) {
        return {
          ...u,
          firstName,
          lastName,
          bio,
          location,
          website,
          instagram,
          facebook,
          viber,
          categories: selectedCategories
        };
      }
      return u;
    });
    
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    toast.success('Профіль оновлено');
  };
  
  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error('Введіть поточний пароль');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Нові паролі не співпадають');
      return;
    }
    
    // Якщо користувач увійшов з тимчасовим паролем або пароль не був встановлений раніше
    const isFirstPasswordSet = !user.password || user.password === '' || user.password === '00000000';
    
    // Перевіряємо поточний пароль, якщо це не перша установка пароля
    if (!isFirstPasswordSet && currentPassword !== user.password) {
      toast.error('Неправильний поточний пароль');
      return;
    }
    
    // Оновлюємо пароль користувача в localStorage
    const updatedUser = {
      ...user,
      password: newPassword
    };
    
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    
    // Оновлюємо пароль користувача в списку всіх користувачів
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) => {
      if (u.id === user.id) {
        return {
          ...u,
          password: newPassword
        };
      }
      return u;
    });
    
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    toast.success('Пароль змінено');
    
    // Очищаємо поля
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };
  
  // Обробник для зміни стану чекбоксів категорій
  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">Завантаження...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container grid grid-cols-12 gap-6 px-4 md:px-6 py-6">
        {/* Меню на лівій стороні */}
        <div className="col-span-12 md:col-span-3">
          <div className="sticky top-20 space-y-6">
            {/* Профіль користувача */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted">
                  <img 
                    src={user.avatarUrl || '/placeholder.svg'} 
                    alt={`${firstName} ${lastName}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{user.firstName} {user.lastName}</h2>
                  <p className="text-sm text-muted-foreground">{user.phoneNumber}</p>
                </div>
              </div>
            </div>
            
            {/* Навігація налаштувань */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="bg-muted px-4 py-2">
                <h3 className="font-medium">Налаштування</h3>
              </div>
              <div className="p-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/profile/' + user.id)}>
                  Перейти до профілю
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Основний контент */}
        <div className="col-span-12 md:col-span-9 space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Налаштування акаунту</h1>
              
              <Tabs defaultValue="profile">
                <TabsList className="mb-4">
                  <TabsTrigger value="profile">Профіль</TabsTrigger>
                  <TabsTrigger value="security">Безпека</TabsTrigger>
                  <TabsTrigger value="categories">Професійні категорії</TabsTrigger>
                  <TabsTrigger value="social">Соціальні мережі</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Ім'я</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Прізвище</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled // Номер телефону не можна змінити, оскільки він використовується для входу
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Про себе</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Місце розташування</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Веб-сайт</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                  
                  <Button onClick={handleSaveProfile}>Зберегти зміни</Button>
                </TabsContent>
                
                <TabsContent value="security" className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Зміна паролю</h2>
                    <Separator className="my-4" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Поточний пароль</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Новий пароль</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Підтвердження нового паролю</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button onClick={handleChangePassword}>Змінити пароль</Button>
                </TabsContent>
                
                <TabsContent value="categories" className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Професійні категорії</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Виберіть категорії, які відповідають вашій професійній діяльності. 
                      Ви можете вибрати кілька категорій.
                    </p>
                    <Separator className="my-4" />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`category-${category.id}`} 
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => 
                            handleCategoryChange(category.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`category-${category.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {category.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  <Button onClick={handleSaveProfile}>Зберегти категорії</Button>
                </TabsContent>
                
                <TabsContent value="social" className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Соціальні мережі</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Додайте посилання на ваші соціальні мережі, щоб інші користувачі могли вас знайти
                    </p>
                    <Separator className="my-4" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Instagram className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input
                          id="instagram"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          placeholder="Ваш username в Instagram"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Facebook className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="facebook">Facebook</Label>
                        <Input
                          id="facebook"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          placeholder="Посилання на ваш профіль у Facebook"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="viber">Viber</Label>
                        <Input
                          id="viber"
                          value={viber}
                          onChange={(e) => setViber(e.target.value)}
                          placeholder="Ваш номер у Viber"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveProfile}>Зберегти соціальні мережі</Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
