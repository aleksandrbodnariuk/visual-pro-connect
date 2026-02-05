
import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { BannerUpload } from '@/components/profile/BannerUpload';
import { useAuthState } from '@/hooks/auth/useAuthState';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/components/search/SearchCategories';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

export default function Settings() {
  const { language } = useLanguage();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState("general");
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Отримуємо email з auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);
  
  // Завантаження категорій користувача
  useEffect(() => {
    if (currentUser?.id) {
      const fetchCategories = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('categories')
          .eq('id', currentUser.id)
          .single();
          
        if (!error && data?.categories) {
          setSelectedCategories(data.categories);
        }
      };
      fetchCategories();
    }
  }, [currentUser?.id]);
  
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  const handleSaveCategories = async () => {
    if (!currentUser?.id) return;
    
    setIsSavingCategories(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ categories: selectedCategories })
        .eq('id', currentUser.id);
        
      if (error) throw error;
      toast.success('Категорії збережено');
    } catch (error) {
      console.error('Error saving categories:', error);
      toast.error('Помилка при збереженні категорій');
    } finally {
      setIsSavingCategories(false);
    }
  };
  
  return (
    <div className="min-h-screen pb-safe-nav">
      <Navbar />
      
      <div className="container mt-8 grid grid-cols-12 gap-6 px-4 md:px-6">
        <div className="hidden md:block md:col-span-4 lg:col-span-3">
          <Sidebar className="sticky top-20" />
        </div>
        
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          <h1 className="text-3xl font-bold mb-6">{t.settings}</h1>
          
          <Tabs 
            defaultValue="general" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="general">Загальні</TabsTrigger>
              <TabsTrigger value="profile">Профіль</TabsTrigger>
              <TabsTrigger value="profession">Професія</TabsTrigger>
              <TabsTrigger value="notifications">Сповіщення</TabsTrigger>
              <TabsTrigger value="privacy">Конфіденційність</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general">
              {currentUser && (
                <AccountSettings 
                  userId={currentUser.id}
                  userData={{
                    full_name: currentUser.full_name || currentUser.firstName + ' ' + currentUser.lastName,
                    phone_number: currentUser.phone_number || currentUser.phoneNumber,
                    email: userEmail,
                  }}
                />
              )}
            </TabsContent>
            
            <TabsContent value="profile">
              <div className="grid gap-6">
                {currentUser && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Аватар профілю</CardTitle>
                        <CardDescription>Редагувати зображення профілю</CardDescription>
                      </CardHeader>
                      <CardContent className="flex justify-center py-6">
                        <AvatarUpload 
                          userId={currentUser.id} 
                          avatarUrl={currentUser.avatarUrl}
                        />
                      </CardContent>
                    </Card>
                    
                    <BannerUpload 
                      userId={currentUser.id}
                      existingBannerUrl={currentUser.bannerUrl}
                    />
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="profession">
              <Card>
                <CardHeader>
                  <CardTitle>Ваша професія</CardTitle>
                  <CardDescription>
                    Оберіть категорії, які описують вашу діяльність. Це допоможе клієнтам знайти вас.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIES.map(category => {
                      const isSelected = selectedCategories.includes(category.id);
                      const IconComponent = category.icon;
                      return (
                        <div
                          key={category.id}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/10' 
                              : 'border-input hover:bg-muted/50 hover:border-muted-foreground/30'
                          }`}
                          onClick={() => toggleCategory(category.id)}
                        >
                          <div className={`p-2 rounded-full bg-gradient-to-r ${category.color}`}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-medium flex-1">{category.name}</span>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <Button 
                    onClick={handleSaveCategories} 
                    className="mt-6"
                    disabled={isSavingCategories}
                  >
                    {isSavingCategories ? 'Збереження...' : 'Зберегти категорії'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Налаштування сповіщень</CardTitle>
                  <CardDescription>Керуйте сповіщеннями, які ви отримуєте</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Налаштування сповіщень будуть доступні найближчим часом.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Конфіденційність</CardTitle>
                  <CardDescription>Керуйте налаштуваннями конфіденційності</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Налаштування конфіденційності будуть доступні найближчим часом.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
